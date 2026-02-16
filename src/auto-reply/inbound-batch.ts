export type InboundBatchResult<T> = {
  /** The last entry in the batch (usually for state/metadata inheritance). */
  last: T;
  /** The first entry in the batch. */
  first: T;
  /** The concatenated text from all entries. */
  combinedText: string;
  /** All non-empty IDs extracted from the entries. */
  ids: string[];
  /** The ID of the first entry, if available. */
  firstId?: string;
  /** The ID of the last entry, if available. */
  lastId?: string;
  /** True if any entry in the batch was marked as mentioned. */
  anyMentioned: boolean;
};

/**
 * Summarizes a batch of inbound messages into a single combined representation.
 * Useful for debouncing multi-part messages into a single agent turn.
 */
export function summarizeInboundBatch<T>(params: {
  entries: T[];
  getText: (entry: T) => string | undefined | null;
  getId?: (entry: T) => string | undefined | null;
  getWasMentioned?: (entry: T) => boolean | undefined | null;
  separator?: string;
}): InboundBatchResult<T> | null {
  const { entries, getText, getId, getWasMentioned, separator = "\n" } = params;
  const last = entries.at(-1);
  const first = entries[0];
  if (!last || !first) {
    return null;
  }

  if (entries.length === 1) {
    const text = getText(last) ?? "";
    const id = getId?.(last) ?? undefined;
    return {
      last,
      first,
      combinedText: text,
      ids: id ? [id] : [],
      firstId: id,
      lastId: id,
      anyMentioned: Boolean(getWasMentioned?.(last)),
    };
  }

  const combinedText = entries
    .map(getText)
    .filter((t): t is string => typeof t === "string" && t.length > 0)
    .join(separator);

  const ids = getId
    ? entries.map(getId).filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  const anyMentioned = entries.some((entry) => Boolean(getWasMentioned?.(entry)));

  return {
    last,
    first,
    combinedText,
    ids,
    firstId: ids[0],
    lastId: ids.at(-1),
    anyMentioned,
  };
}
