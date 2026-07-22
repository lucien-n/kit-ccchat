import { TYPING_TIMEOUT_MS } from "@ccchat/shared";

export interface Typist {
  channelId: string;
  userId: string;
  expiresAt: number;
}

const isnt = (channelId: string, userId: string) => (t: Typist) =>
  t.channelId !== channelId || t.userId !== userId;

/** Announcing yourself again pushes your own expiry back, so a long message does
 *  not blink the indicator off mid-sentence. */
export function withTypist(
  typists: Typist[],
  channelId: string,
  userId: string,
  now = Date.now(),
): Typist[] {
  return [
    ...typists.filter(isnt(channelId, userId)),
    { channelId, userId, expiresAt: now + TYPING_TIMEOUT_MS },
  ];
}

export function withoutTypist(
  typists: Typist[],
  channelId: string,
  userId: string,
): Typist[] {
  return typists.filter(isnt(channelId, userId));
}

/** Nobody sends a "stopped" event and a crashed tab could not send one anyway,
 *  so going quiet is the only thing that ever ends a typing indicator. */
export function unexpired(typists: Typist[], now = Date.now()): Typist[] {
  return typists.filter((t) => t.expiresAt > now);
}

export function stillOnline(typists: Typist[], online: string[]): Typist[] {
  const live = new Set(online);
  return typists.filter((t) => live.has(t.userId));
}

export function typistsIn(
  typists: Typist[],
  channelId: string,
  exclude?: string,
): string[] {
  return typists
    .filter((t) => t.channelId === channelId && t.userId !== exclude)
    .map((t) => t.userId);
}

/** "Alice and Bob are typing...". Past three names the list is longer than the
 *  message it is announcing, so it collapses to a count. */
export function typingLabel(names: string[]): string {
  const [a, b, c] = names;
  switch (names.length) {
    case 0:
      return "";
    case 1:
      return `${a} is typing...`;
    case 2:
      return `${a} and ${b} are typing...`;
    case 3:
      return `${a}, ${b} and ${c} are typing...`;
    default:
      return "Several people are typing...";
  }
}
