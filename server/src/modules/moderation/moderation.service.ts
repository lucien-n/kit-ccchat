import type { ModeratedMember } from "@ccchat/shared";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { sessions, users, type User } from "../../db/schema";
import { httpError } from "../../http/errors.js";
import { authLevel } from "../../permissions.js";
import { toModeratedMember } from "../../views.js";

/** Nobody may act on their own rank or above, so an admin can't ban the owner or
 *  another admin. */
export function resolveTarget(actor: User, targetId: string): User {
  const target = db.select().from(users).where(eq(users.id, targetId)).get();
  if (!target) httpError(404, "user not found");
  if (target.id === actor.id) httpError(400, "you cannot moderate yourself");
  if (authLevel(target) >= authLevel(actor)) httpError(403, "target outranks you");
  return target;
}

const endSessions = (userId: string) =>
  db.delete(sessions).where(eq(sessions.userId, userId)).run();

const patchUser = (userId: string, patch: Partial<User>) =>
  db.update(users).set(patch).where(eq(users.id, userId)).run();

/** Kick ends every active session and marks the account, so returning takes a
 *  fresh invite rather than just signing back in. */
export function kick(target: User) {
  patchUser(target.id, { kickedAt: Date.now() });
  endSessions(target.id);
}

export function ban(target: User) {
  patchUser(target.id, { banned: 1 });
  endSessions(target.id);
}

export function unban(target: User) {
  patchUser(target.id, { banned: 0 });
}

export function mute(target: User, minutes: number): number {
  const mutedUntil = Date.now() + minutes * 60_000;
  patchUser(target.id, { mutedUntil });
  return mutedUntil;
}

export function unmute(target: User) {
  patchUser(target.id, { mutedUntil: null });
}

export function listMembers(): ModeratedMember[] {
  return db.select().from(users).all().map(toModeratedMember);
}
