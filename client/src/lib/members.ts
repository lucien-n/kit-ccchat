import type { Member, ModeratedMember } from "$lib/api";

type Ranked = Pick<Member, "isOwner" | "isAdmin" | "displayName">;

export const rankOf = (m: Pick<Member, "isOwner" | "isAdmin">) =>
  m.isOwner ? 2 : m.isAdmin ? 1 : 0;

export const rankLabel = (m: Pick<Member, "isOwner" | "isAdmin">) =>
  m.isOwner ? "owner" : m.isAdmin ? "admin" : "member";

/** Rank first (owner over admin over member), then display name. */
export const byRank = (a: Ranked, b: Ranked) =>
  rankOf(b) - rankOf(a) || a.displayName.localeCompare(b.displayName);

/** A past `mutedUntil` is a mute that has already expired, not an active one. */
export const isMuted = (m: Pick<ModeratedMember, "mutedUntil">) =>
  m.mutedUntil != null && m.mutedUntil > Date.now();

type Rankable = Pick<Member, "id" | "isOwner" | "isAdmin">;

/** Mirrors the server's authLevel check: you may only act on someone strictly
 *  below your own rank, which also rules out acting on yourself. */
export const canModerate = (
  actor: Rankable | null | undefined,
  target: Rankable | null | undefined,
) => !!actor && !!target && rankOf(target) < rankOf(actor);
