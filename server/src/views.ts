import {
  Permission,
  REPLY_SNIPPET_MAX,
  type Member,
  type MemberRef,
  type MessageView,
  type ModeratedMember,
  type ReplyRef,
  type Role,
  type SystemEvent,
} from "@ccchat/shared";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import {
  messagesTable,
  rolesTable,
  usersTable,
  type Message,
  type User,
} from "./db/schema";
import { mentionsOf } from "./modules/messages/mentions.js";
import { colorFor, isAdmin, isOwner, roleIdsOf } from "./permissions.js";

export function toMember(u: {
  id: string;
  username: string;
  displayName: string;
  isOwner: number;
  avatarVersion?: number | null;
}): Member {
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

export function toModeratedMember(u: User): ModeratedMember {
  return {
    ...toMember(u),
    banned: u.banned,
    mutedUntil: u.mutedUntil,
    roleIds: roleIdsOf(u.id),
  };
}

export function toRoleView(r: typeof rolesTable.$inferSelect): Role {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    permission: r.permission as Permission,
    position: r.position,
  };
}

function authorOf(userId: string): MemberRef | null {
  const a = db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarVersion: usersTable.avatarVersion,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .get();
  return a
    ? { ...a, color: colorFor(a.id), avatarVersion: a.avatarVersion ?? null }
    : null;
}

/** Spread across code points, not UTF-16 units, so the cut never lands inside an
 *  emoji. Rendered as one line, so newlines collapse to spaces. */
export function excerpt(content: string, max = REPLY_SNIPPET_MAX) {
  const flat = content.replace(/\s+/g, " ").trim();
  return Array.from(flat).slice(0, max).join("");
}

/** A deleted original still holds its place in the conversation, but gives up
 *  its content and its author: the client renders a tombstone instead. */
function toReplyRef(id: string): ReplyRef | null {
  const m = db.select().from(messagesTable).where(eq(messagesTable.id, id)).get();
  if (!m) return null;
  if (m.deleted) return { id: m.id, content: "", author: null, deleted: true };
  return {
    id: m.id,
    content: excerpt(m.content),
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
    mentions: mentionsOf(m.id),
    mentionsEveryone: m.mentionsEveryone === 1,
  };
}
