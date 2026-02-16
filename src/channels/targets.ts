export type { DirectoryConfigParams } from "./plugins/directory-config.js";
export type { ChannelDirectoryEntry } from "./plugins/types.js";

export type MessagingTargetKind = "user" | "channel";

export type MessagingTarget = {
  kind: MessagingTargetKind;
  id: string;
  raw: string;
  normalized: string;
};

export type MessagingTargetParseOptions = {
  defaultKind?: MessagingTargetKind;
  ambiguousMessage?: string;
};

export function normalizeTargetId(kind: MessagingTargetKind, id: string): string {
  return `${kind}:${id}`.toLowerCase();
}

export function buildMessagingTarget(
  kind: MessagingTargetKind,
  id: string,
  raw: string,
): MessagingTarget {
  return {
    kind,
    id,
    raw,
    normalized: normalizeTargetId(kind, id),
  };
}

export function ensureTargetId(params: {
  candidate: string;
  pattern: RegExp;
  errorMessage: string;
}): string {
  if (!params.pattern.test(params.candidate)) {
    throw new Error(params.errorMessage);
  }
  return params.candidate;
}

export function requireTargetKind(params: {
  platform: string;
  target: MessagingTarget | undefined;
  kind: MessagingTargetKind;
}): string {
  const kindLabel = params.kind;
  if (!params.target) {
    throw new Error(`${params.platform} ${kindLabel} id is required.`);
  }
  if (params.target.kind !== params.kind) {
    throw new Error(`${params.platform} ${kindLabel} id is required (use ${kindLabel}:<id>).`);
  }
  return params.target.id;
}

/**
 * Strip common channel prefixes like "slack:", "tg:", "telegram:", etc.
 *
 * @param to - The target string to strip.
 * @param prefixes - Array of prefixes to strip (case-insensitive).
 * @returns The stripped target string.
 */
export function stripChannelPrefixes(to: string, prefixes: string[]): string {
  let trimmed = to.trim();
  const lowerPrefixes = prefixes.map((p) => p.toLowerCase());

  while (true) {
    let found = false;
    const lower = trimmed.toLowerCase();
    for (const prefix of lowerPrefixes) {
      if (lower.startsWith(prefix)) {
        trimmed = trimmed.slice(prefix.length).trim();
        found = true;
        break;
      }
    }
    if (!found) {
      break;
    }
  }
  return trimmed;
}
