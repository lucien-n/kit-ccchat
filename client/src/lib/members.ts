import type { Member } from "$lib/api";

type Ranked = Pick<Member, "isOwner" | "isAdmin" | "displayName">;

export const rankOf = (m: Pick<Member, "isOwner" | "isAdmin">) =>
  m.isOwner ? 2 : m.isAdmin ? 1 : 0;

/** Rank first (owner over admin over member), then display name. */
export const byRank = (a: Ranked, b: Ranked) =>
  rankOf(b) - rankOf(a) || a.displayName.localeCompare(b.displayName);
