import { eq } from "drizzle-orm";
import type { MessageView, PublicUser } from "@ccchat/shared";
import { db } from "./db/index.js";
import { users, type Message } from "./db/schema.js";

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
