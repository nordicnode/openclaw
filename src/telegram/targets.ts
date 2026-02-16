export type TelegramTarget = {
  chatId: string;
  messageThreadId?: number;
  chatType: "direct" | "group" | "unknown";
};

export function stripTelegramInternalPrefixes(to: string): string {
  const prefixes = ["telegram:", "tg:"];
  let trimmed = to.trim();
  let strippedTelegramPrefix = false;

  while (true) {
    let found = false;
    const lower = trimmed.toLowerCase();
    for (const prefix of prefixes) {
      if (lower.startsWith(prefix)) {
        trimmed = trimmed.slice(prefix.length).trim();
        strippedTelegramPrefix = true;
        found = true;
        break;
      }
    }
    if (strippedTelegramPrefix && trimmed.toLowerCase().startsWith("group:")) {
      trimmed = trimmed.slice("group:".length).trim();
      found = true;
    }
    if (!found) {
      break;
    }
  }

  return trimmed;
}

/**
 * Parse a Telegram delivery target into chatId and optional topic/thread ID.
 *
 * Supported formats:
 * - `chatId` (plain chat ID, t.me link, @username, or internal prefixes like `telegram:...`)
 * - `chatId:topicId` (numeric topic/thread ID)
 * - `chatId:topic:topicId` (explicit topic marker; preferred)
 */
function resolveTelegramChatType(chatId: string): "direct" | "group" | "unknown" {
  const trimmed = chatId.trim();
  if (!trimmed) {
    return "unknown";
  }
  if (/^-?\d+$/.test(trimmed)) {
    return trimmed.startsWith("-") ? "group" : "direct";
  }
  return "unknown";
}

export function parseTelegramTarget(to: string): TelegramTarget {
  const normalized = stripTelegramInternalPrefixes(to);

  const topicMatch = /^(.+?):topic:(\d+)$/.exec(normalized);
  if (topicMatch) {
    return {
      chatId: topicMatch[1],
      messageThreadId: Number.parseInt(topicMatch[2], 10),
      chatType: resolveTelegramChatType(topicMatch[1]),
    };
  }

  const colonMatch = /^(.+):(\d+)$/.exec(normalized);
  if (colonMatch) {
    return {
      chatId: colonMatch[1],
      messageThreadId: Number.parseInt(colonMatch[2], 10),
      chatType: resolveTelegramChatType(colonMatch[1]),
    };
  }

  return {
    chatId: normalized,
    chatType: resolveTelegramChatType(normalized),
  };
}

export function resolveTelegramTargetChatType(target: string): "direct" | "group" | "unknown" {
  return parseTelegramTarget(target).chatType;
}
