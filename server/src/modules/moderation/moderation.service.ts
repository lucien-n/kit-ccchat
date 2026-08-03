import { DeleteSpan, ServerEventType, type ModeratedMember } from "@ccchat/shared";
import { and, eq, gte } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  messageReactionsTable,
  messagesTable,
  sessionsTable,
  usersTable,
  type User,
} from "../../db/schema";
import { httpError } from "../../http/errors.js";
import { hub } from "../../hub.js";
import { authLevel } from "../../permissions.js";
import { toModeratedMember } from "../../views.js";
import { deleteImagesOf } from "../images/images.service.js";
import { reactionsOf } from "../messages/reactions.js";

/** Nobody may act on their own rank or above, so an admin can't ban the owner or
 *  another admin. */
export function resolveTarget(actor: User, targetId: string): User {
  const target = db.select().from(usersTable).where(eq(usersTable.id, targetId)).get();
  if (!target) httpError(404, "user not found");
  if (target.id === actor.id) httpError(400, "you cannot moderate yourself");
  if (authLevel(target) >= authLevel(actor)) httpError(403, "target outranks you");
  return target;
}

const endSessions = (userId: string) =>
  db.delete(sessionsTable).where(eq(sessionsTable.userId, userId)).run();

const patchUser = (userId: string, patch: Partial<User>) =>
  db.update(usersTable).set(patch).where(eq(usersTable.id, userId)).run();

/** Kick ends every active session and marks the account, so returning takes a
 *  fresh invite rather than just signing back in. */
export function kick(target: User) {
  patchUser(target.id, { kickedAt: Date.now() });
  endSessions(target.id);
}

const SPAN_MS: Record<DeleteSpan.Hour | DeleteSpan.Day | DeleteSpan.Week, number> = {
  [DeleteSpan.Hour]: 3_600_000,
  [DeleteSpan.Day]: 86_400_000,
  [DeleteSpan.Week]: 604_800_000,
};

/** Oldest timestamp to purge, or null when nothing should be deleted. `All`
 *  reaches back to 0 so every message and reaction goes. */
function cutoffFor(span: DeleteSpan): number | null {
  if (span === DeleteSpan.None) return null;
  if (span === DeleteSpan.All) return 0;
  return Date.now() - SPAN_MS[span];
}

/** Soft-delete every message the member posted since the cutoff. Reuses the same
 *  `deleted` flag and per-message broadcast as a normal delete, so live clients
 *  drop them the same way. */
function purgeMessages(userId: string, cutoff: number) {
  const rows = db
    .select({ id: messagesTable.id, channelId: messagesTable.channelId })
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.authorId, userId),
        eq(messagesTable.deleted, 0),
        gte(messagesTable.createdAt, cutoff),
      ),
    )
    .all();
  if (!rows.length) return;

  db.update(messagesTable)
    .set({ deleted: 1 })
    .where(
      and(
        eq(messagesTable.authorId, userId),
        eq(messagesTable.deleted, 0),
        gte(messagesTable.createdAt, cutoff),
      ),
    )
    .run();

  for (const { id, channelId } of rows) {
    deleteImagesOf(id);
    hub.broadcast({ type: ServerEventType.Message_Deleted, id, channelId });
  }
}

/** Drop every reaction the member left on anyone's messages since the cutoff,
 *  then repaint the counts on the messages that survive. */
function purgeReactions(userId: string, cutoff: number) {
  const affected = db
    .select({ messageId: messageReactionsTable.messageId })
    .from(messageReactionsTable)
    .where(
      and(
        eq(messageReactionsTable.userId, userId),
        gte(messageReactionsTable.createdAt, cutoff),
      ),
    )
    .all();
  const ids = [...new Set(affected.map((r) => r.messageId))];
  if (!ids.length) return;

  db.delete(messageReactionsTable)
    .where(
      and(
        eq(messageReactionsTable.userId, userId),
        gte(messageReactionsTable.createdAt, cutoff),
      ),
    )
    .run();

  for (const id of ids) {
    const msg = db
      .select({ channelId: messagesTable.channelId, deleted: messagesTable.deleted })
      .from(messagesTable)
      .where(eq(messagesTable.id, id))
      .get();
    if (!msg || msg.deleted) continue;
    hub.broadcast({
      type: ServerEventType.Message_Reacted,
      id,
      channelId: msg.channelId,
      reactions: reactionsOf(id),
    });
  }
}

export function ban(target: User, span: DeleteSpan = DeleteSpan.None) {
  patchUser(target.id, { banned: 1 });
  endSessions(target.id);

  const cutoff = cutoffFor(span);
  if (cutoff === null) return;
  purgeMessages(target.id, cutoff);
  purgeReactions(target.id, cutoff);
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
  return db.select().from(usersTable).all().map(toModeratedMember);
}
