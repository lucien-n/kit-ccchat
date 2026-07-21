import {
  ChannelType,
  ServerEventType,
  type EditMessageBody,
  type MessageView,
  type MessageWindow,
  type SystemEvent,
} from "@ccchat/shared";
import { and, asc, desc, eq, gt, lt, lte } from "drizzle-orm";
import { can, newId } from "../../auth.js";
import { db } from "../../db/index.js";
import { channels, messages, type User } from "../../db/schema";
import { httpError } from "../../http/errors.js";
import { hub } from "../../hub.js";
import { toMessageView } from "../../views.js";
import { resolveMentions, saveMentions } from "./mentions.js";

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
    mentionsEveryone: 0,
  };
  db.insert(messages).values(row).run();
  hub.broadcast({ type: ServerEventType.Message_New, message: toMessageView(row) });
}

export function history(
  channelId: string,
  { before, after, limit }: { before?: number; after?: number; limit: number },
): MessageView[] {
  const bound = after
    ? gt(messages.createdAt, after)
    : before
      ? lt(messages.createdAt, before)
      : undefined;

  const rows = db
    .select()
    .from(messages)
    .where(and(eq(messages.channelId, channelId), eq(messages.deleted, 0), bound))
    // Paging back is queried newest-first so `limit` takes the latest page, then
    // reversed; paging forward already runs in the direction it is read.
    .orderBy(after ? asc(messages.createdAt) : desc(messages.createdAt))
    .limit(limit)
    .all();

  return (after ? rows : rows.reverse()).map(toMessageView);
}

export function around(
  channelId: string,
  messageId: string,
  limit: number,
): MessageWindow | null {
  const target = db.select().from(messages).where(eq(messages.id, messageId)).get();
  if (!target || target.channelId !== channelId || target.deleted) return null;

  const visible = and(eq(messages.channelId, channelId), eq(messages.deleted, 0));

  // One extra each way answers "is there more?" without a second count query.
  const older = db
    .select()
    .from(messages)
    .where(and(visible, lte(messages.createdAt, target.createdAt)))
    .orderBy(desc(messages.createdAt))
    .limit(limit + 1)
    .all();
  const newer = db
    .select()
    .from(messages)
    .where(and(visible, gt(messages.createdAt, target.createdAt)))
    .orderBy(asc(messages.createdAt))
    .limit(limit + 1)
    .all();

  return {
    messages: [...older.slice(0, limit).reverse(), ...newer.slice(0, limit)].map(
      toMessageView,
    ),
    hasMoreBefore: older.length > limit,
    hasMoreAfter: newer.length > limit,
  };
}

export function editMessage(id: string, user: User, { content }: EditMessageBody) {
  const msg = db.select().from(messages).where(eq(messages.id, id)).get();
  if (!msg || msg.deleted) httpError(404, "not found");
  if (msg.systemEvent) httpError(400, "cannot edit a system message");
  if (msg.authorId !== user.id) httpError(403, "forbidden");

  const editedAt = Date.now();
  const { userIds, everyone } = resolveMentions(content, user.id);
  const mentionsEveryone = everyone ? 1 : 0;
  db.update(messages)
    .set({ content, editedAt, mentionsEveryone })
    .where(eq(messages.id, id))
    .run();
  saveMentions(id, userIds);
  const view = toMessageView({ ...msg, content, editedAt, mentionsEveryone });
  hub.broadcast({ type: ServerEventType.Message_Edited, message: view });
  return view;
}

export function deleteMessage(id: string, user: User) {
  const msg = db.select().from(messages).where(eq(messages.id, id)).get();
  if (!msg || msg.deleted) httpError(404, "not found");
  if (msg.authorId !== user.id && !can(user, "deleteAnyMessage"))
    httpError(403, "forbidden");

  db.update(messages).set({ deleted: 1 }).where(eq(messages.id, id)).run();
  hub.broadcast({ type: ServerEventType.Message_Deleted, id, channelId: msg.channelId });
}
