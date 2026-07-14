import { eq } from 'drizzle-orm';
import { db } from './db/index.js';
import { messages, users, type Message } from './db/schema.js';

/** The safe, public shape of a user (no password hash), shared across responses. */
export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  avatarVersion: number | null;
}

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

/** Shape sent to clients for a single message (author denormalized in). */
export interface MessageView {
  id: string;
  channelId: string;
  content: string;
  createdAt: number;
  editedAt: number | null;
  author: { id: string; username: string; displayName: string; avatarVersion: number | null } | null;
}

export function toMessageView(m: Message): MessageView {
  const author = db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarVersion: users.avatarVersion,
    })
    .from(users)
    .where(eq(users.id, m.authorId))
    .get();
  return {
    id: m.id,
    channelId: m.channelId,
    content: m.content,
    createdAt: m.createdAt,
    editedAt: m.editedAt,
    author: author ? { ...author, avatarVersion: author.avatarVersion ?? null } : null,
  };
}

export function getMessage(id: string): Message | undefined {
  return db.select().from(messages).where(eq(messages.id, id)).get();
}
