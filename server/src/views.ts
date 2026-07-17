import { eq } from "drizzle-orm";
import {
  REPLY_SNIPPET_MAX,
  type MessageView,
  type PublicUser,
  type ReplyRef,
} from "@ccchat/shared";
import { db } from "./db/index.js";
import { messages, users, type Message } from "./db/schema.js";

export function toPublicUser(u: {
  id: string;
  username: string;
  displayName: string;
  role: string;
  avatarVersion?: number | null;
}): PublicUser {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    avatarVersion: u.avatarVersion ?? null,
  };
}

function authorOf(userId: string) {
  const a = db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarVersion: users.avatarVersion,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  return a ? { ...a, avatarVersion: a.avatarVersion ?? null } : null;
}

/** Spread across code points, not UTF-16 units, so the cut never lands inside an
 *  emoji. The quote is rendered as one line, so newlines collapse to spaces. */
function snippet(content: string) {
  const flat = content.replace(/\s+/g, " ").trim();
  return Array.from(flat).slice(0, REPLY_SNIPPET_MAX).join("");
}

/** A deleted original still holds its place in the conversation, but gives up
 *  its content and its author: the client renders a tombstone instead. */
function toReplyRef(id: string): ReplyRef | null {
  const m = db.select().from(messages).where(eq(messages.id, id)).get();
  if (!m) return null;
  if (m.deleted) return { id: m.id, content: "", author: null, deleted: true };
  return {
    id: m.id,
    content: snippet(m.content),
    author: authorOf(m.authorId),
    deleted: false,
  };
}

export function toMessageView(m: Message): MessageView {
  return {
    id: m.id,
    channelId: m.channelId,
    content: m.content,
    createdAt: m.createdAt,
    editedAt: m.editedAt,
    author: authorOf(m.authorId),
    replyTo: m.replyToId ? toReplyRef(m.replyToId) : null,
  };
}
