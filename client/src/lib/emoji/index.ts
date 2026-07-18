import type { EmojiEntry, EmojiGroup } from "./data";

export type { EmojiEntry, EmojiGroup };

export type EmojiIndex = {
  readonly groups: readonly EmojiGroup[];
  readonly all: readonly EmojiEntry[];
};

let pending: Promise<EmojiIndex> | null = null;

export function loadEmoji(): Promise<EmojiIndex> {
  pending ??= import("./data").then(({ EMOJI_GROUPS }) => ({
    groups: EMOJI_GROUPS,
    all: EMOJI_GROUPS.flatMap((g) => [...g.emojis]),
  }));
  return pending;
}

const words = (s: string) => (s ? s.split(" ") : []);

export const emojiLabel = (shortcode: string) => shortcode.replace(/_/g, " ");

export function searchEmoji(index: EmojiIndex, query: string, limit = 12): EmojiEntry[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, "_");
  if (!q) return [];

  const exact: EmojiEntry[] = [];
  const prefix: EmojiEntry[] = [];
  const rest: EmojiEntry[] = [];

  for (const entry of index.all) {
    const [, shortcode, names, tags] = entry;
    const named = [shortcode, ...words(names)];

    if (named.includes(q)) exact.push(entry);
    else if (named.some((n) => n.startsWith(q))) prefix.push(entry);
    else if (named.some((n) => n.includes(q)) || words(tags).some((t) => t.startsWith(q)))
      rest.push(entry);

    if (exact.length >= limit) break;
  }

  return [...exact, ...prefix, ...rest].slice(0, limit);
}

const QUERY = /(?:^|[\s([{<])(:([a-z0-9_+-]{2,}))$/i;

export function shortcodeQuery(before: string): { start: number; query: string } | null {
  const m = QUERY.exec(before);
  if (!m) return null;
  return { start: before.length - m[1].length, query: m[2] };
}
