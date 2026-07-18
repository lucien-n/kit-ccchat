import {
  Permission,
  REPLY_SNIPPET_MAX,
  type MemberView,
  type MessageView,
  type PublicUser,
  type ReplyRef,
  type Role,
  type SystemEvent,
} from "@ccchat/shared";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { messages, roles, users, type Message, type User } from "./db/schema";
import { colorFor, isAdmin, isOwner, roleIdsOf } from "./permissions.js";

export function toPublicUser(u: {
  id: string;
  username: string;
  displayName: string;
  isOwner: number;
  avatarVersion?: number | null;
}): PublicUser {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    isOwner: isOwner(u),
    isAdmin: isAdmin(u),
    color: colorFor(u.id),
    avatarVersion: u.avatarVersion ?? null,
  };
}

export function toMemberView(u: User): MemberView {
  return {
    ...toPublicUser(u),
    banned: u.banned,
    mutedUntil: u.mutedUntil,
    roleIds: roleIdsOf(u.id),
  };
}

export function toRoleView(r: typeof roles.$inferSelect): Role {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    permission: r.permission as Permission,
    position: r.position,
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
  return a
    ? { ...a, color: colorFor(a.id), avatarVersion: a.avatarVersion ?? null }
    : null;
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
    systemEvent: (m.systemEvent as SystemEvent | null) ?? null,
  };
}
