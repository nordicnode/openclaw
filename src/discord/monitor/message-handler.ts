import type { Client } from "@buape/carbon";
import type { DiscordMessageEvent, DiscordMessageHandler } from "./listeners.js";
import type { DiscordMessagePreflightParams } from "./message-handler.preflight.types.js";
import { hasControlCommand } from "../../auto-reply/command-detection.js";
import { summarizeInboundBatch } from "../../auto-reply/inbound-batch.js";
import {
  createInboundDebouncer,
  resolveInboundDebounceMs,
} from "../../auto-reply/inbound-debounce.js";
import { danger } from "../../globals.js";
import { preflightDiscordMessage } from "./message-handler.preflight.js";
import { processDiscordMessage } from "./message-handler.process.js";
import { resolveDiscordMessageChannelId, resolveDiscordMessageText } from "./message-utils.js";

type DiscordMessageHandlerParams = Omit<
  DiscordMessagePreflightParams,
  "ackReactionScope" | "groupPolicy" | "data" | "client"
>;

export function createDiscordMessageHandler(
  params: DiscordMessageHandlerParams,
): DiscordMessageHandler {
  const groupPolicy = params.discordConfig?.groupPolicy ?? "open";
  const ackReactionScope = params.cfg.messages?.ackReactionScope ?? "group-mentions";
  const debounceMs = resolveInboundDebounceMs({ cfg: params.cfg, channel: "discord" });

  const debouncer = createInboundDebouncer<{ data: DiscordMessageEvent; client: Client }>({
    debounceMs,
    buildKey: (entry) => {
      const message = entry.data.message;
      const authorId = entry.data.author?.id;
      if (!message || !authorId) {
        return null;
      }
      const channelId = resolveDiscordMessageChannelId({
        message,
        eventChannelId: entry.data.channel_id,
      });
      if (!channelId) {
        return null;
      }
      return `discord:${params.accountId}:${channelId}:${authorId}`;
    },
    shouldDebounce: (entry) => {
      const message = entry.data.message;
      if (!message) {
        return false;
      }
      if (message.attachments && message.attachments.length > 0) {
        return false;
      }
      const baseText = resolveDiscordMessageText(message, { includeForwarded: false });
      if (!baseText.trim()) {
        return false;
      }
      return !hasControlCommand(baseText, params.cfg);
    },
    onFlush: async (entries) => {
      const summary = summarizeInboundBatch({
        entries,
        getText: (entry) =>
          resolveDiscordMessageText(entry.data.message, { includeForwarded: false }),
        getId: (entry) => entry.data.message?.id,
      });
      if (!summary) {
        return;
      }

      const { last, combinedText, ids } = summary;
      const syntheticMessage = {
        ...last.data.message,
        content: combinedText,
        attachments: [],
        message_snapshots: (last.data.message as { message_snapshots?: unknown }).message_snapshots,
        messageSnapshots: (last.data.message as { messageSnapshots?: unknown }).messageSnapshots,
        rawData: {
          ...(last.data.message as { rawData?: Record<string, unknown> }).rawData,
        },
      };
      const syntheticData: DiscordMessageEvent = {
        ...last.data,
        message: syntheticMessage,
      };
      const ctx = await preflightDiscordMessage({
        ...params,
        ackReactionScope,
        groupPolicy,
        data: syntheticData,
        client: last.client,
      });
      if (!ctx) {
        return;
      }
      if (ids.length > 1) {
        const ctxBatch = ctx as typeof ctx & {
          MessageSids?: string[];
          MessageSidFirst?: string;
          MessageSidLast?: string;
        };
        ctxBatch.MessageSids = ids;
        ctxBatch.MessageSidFirst = ids[0];
        ctxBatch.MessageSidLast = ids[ids.length - 1];
      }
      await processDiscordMessage(ctx);
    },
    onError: (err) => {
      params.runtime.error?.(danger(`discord debounce flush failed: ${String(err)}`));
    },
  });

  return async (data, client) => {
    try {
      await debouncer.enqueue({ data, client });
    } catch (err) {
      params.runtime.error?.(danger(`handler failed: ${String(err)}`));
    }
  };
}
