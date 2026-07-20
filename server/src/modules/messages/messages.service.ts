import {
  ChannelType,
  ServerEventType,
  type EditMessageBody,
  type MessageView,
  type SystemEvent,
} from "@ccchat/shared";
import { and, asc, desc, eq, lt } from "drizzle-orm";
import { can, newId } from "../../auth.js";
import { db } from "../../db/index.js";
import { channels, messages, type User } from "../../db/schema";
import { httpError } from "../../http/errors.js";
import { hub } from "../../hub.js";
import { toMessageView } from "../../views.js";

/** Post a system line (e.g. "member joined") to the first text channel and push
 *  it to everyone. `subjectId` is the user the event is about; the client reads
 *  it off the message author. No-op if there is no text channel to post to. */
export function postSystemMessage(event: SystemEvent, subjectId: string) {
  const channel = db
    .select()
    .from(channels)
    .where(eq(channels.type, ChannelType.Text))
    .orderBy(asc(channels.position), asc(channels.createdAt))
    .get();
  if (!channel) return;

  const row = {
    id: newId(),
    channelId: channel.id,
    authorId: subjectId,
    content: "",
    createdAt: Date.now(),
    editedAt: null,
    deleted: 0,
    replyToId: null,
    systemEvent: event,
  };
  db.insert(messages).values(row).run();
  hub.broadcast({ type: ServerEventType.Message_New, message: toMessageView(row) });
}

/** Message history for a channel, oldest-first, keyset-paginated by `before`
 *  (a message createdAt timestamp). Deleted messages are omitted. */
export function history(channelId: string, before: number, limit: number): MessageView[] {
  const rows = db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.channelId, channelId),
        eq(messages.deleted, 0),
        Number.isFinite(before) && before > 0
          ? lt(messages.createdAt, before)
          : undefined,
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .all();

  // Queried newest-first so `limit` takes the latest; the client wants oldest-first.
  return rows.reverse().map(toMessageView);
}

/** Author only: an admin may remove someone's words but never rewrite them.
 *  `editedAt` marks it so the client can show "(edited)". */
export function editMessage(id: string, user: User, { content }: EditMessageBody) {
  const msg = db.select().from(messages).where(eq(messages.id, id)).get();
  if (!msg || msg.deleted) httpError(404, "not found");
  if (msg.systemEvent) httpError(400, "cannot edit a system message");
  if (msg.authorId !== user.id) httpError(403, "forbidden");

  const editedAt = Date.now();
  db.update(messages).set({ content, editedAt }).where(eq(messages.id, id)).run();
  const view = toMessageView({ ...msg, content, editedAt });
  hub.broadcast({ type: ServerEventType.Message_Edited, message: view });
  return view;
}

/** Allowed for the author or any admin/owner. Soft delete so moderation stays
 *  auditable. Broadcasts the removal to everyone live. */
export function deleteMessage(id: string, user: User) {
  const msg = db.select().from(messages).where(eq(messages.id, id)).get();
  if (!msg || msg.deleted) httpError(404, "not found");
  if (msg.authorId !== user.id && !can(user, "deleteAnyMessage"))
    httpError(403, "forbidden");

  db.update(messages).set({ deleted: 1 }).where(eq(messages.id, id)).run();
  hub.broadcast({ type: ServerEventType.Message_Deleted, id, channelId: msg.channelId });
}
