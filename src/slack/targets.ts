import {
  buildMessagingTarget,
  ensureTargetId,
  requireTargetKind,
  stripChannelPrefixes,
  type MessagingTarget,
  type MessagingTargetKind,
  type MessagingTargetParseOptions,
} from "../channels/targets.js";

export type SlackTargetKind = MessagingTargetKind;

export type SlackTarget = MessagingTarget;

type SlackTargetParseOptions = MessagingTargetParseOptions;

export function parseSlackTarget(
  raw: string,
  options: SlackTargetParseOptions = {},
): SlackTarget | undefined {
  const trimmedRaw = raw.trim();
  if (!trimmedRaw) {
    return undefined;
  }

  // Explicit channel-prefixed targets imply user kind.
  if (/^slack:/i.test(trimmedRaw)) {
    const id = stripChannelPrefixes(trimmedRaw, ["slack:"]);
    return id ? buildMessagingTarget("user", id, trimmedRaw) : undefined;
  }

  const trimmed = trimmedRaw;
  const mentionMatch = trimmed.match(/^<@([A-Z0-9]+)>$/i);
  if (mentionMatch) {
    return buildMessagingTarget("user", mentionMatch[1], trimmedRaw);
  }
  if (trimmed.startsWith("user:")) {
    const id = trimmed.slice("user:".length).trim();
    return id ? buildMessagingTarget("user", id, trimmedRaw) : undefined;
  }
  if (trimmed.startsWith("channel:")) {
    const id = trimmed.slice("channel:".length).trim();
    return id ? buildMessagingTarget("channel", id, trimmedRaw) : undefined;
  }
  if (trimmed.startsWith("@")) {
    const candidate = trimmed.slice(1).trim();
    const id = ensureTargetId({
      candidate,
      pattern: /^[A-Z0-9]+$/i,
      errorMessage: "Slack DMs require a user id (use user:<id> or <@id>)",
    });
    return buildMessagingTarget("user", id, trimmedRaw);
  }
  if (trimmed.startsWith("#")) {
    const candidate = trimmed.slice(1).trim();
    const id = ensureTargetId({
      candidate,
      pattern: /^[A-Z0-9]+$/i,
      errorMessage: "Slack channels require a channel id (use channel:<id>)",
    });
    return buildMessagingTarget("channel", id, trimmedRaw);
  }
  if (options.defaultKind) {
    return buildMessagingTarget(options.defaultKind, trimmed, trimmedRaw);
  }
  return buildMessagingTarget("channel", trimmed, trimmedRaw);
}

export function resolveSlackChannelId(raw: string): string {
  const target = parseSlackTarget(raw, { defaultKind: "channel" });
  return requireTargetKind({ platform: "Slack", target, kind: "channel" });
}
