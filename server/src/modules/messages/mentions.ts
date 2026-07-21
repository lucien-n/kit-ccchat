import { parseMentions } from "@ccchat/shared";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { messageMentions, userRoles, users } from "../../db/schema";

export interface ResolvedMentions {
  userIds: string[];
  everyone: boolean;
}

export function resolveMentions(content: string, authorId: string): ResolvedMentions {
  const { usernames, roleIds, everyone } = parseMentions(content);
  const found = new Set<string>();

  if (usernames.length) {
    for (const u of db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.username, usernames))
      .all())
      found.add(u.id);
  }

  if (roleIds.length) {
    for (const r of db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(inArray(userRoles.roleId, roleIds))
      .all())
      found.add(r.userId);
  }

  found.delete(authorId);
  return { userIds: [...found], everyone };
}

export function saveMentions(messageId: string, userIds: string[]) {
  db.delete(messageMentions).where(eq(messageMentions.messageId, messageId)).run();
  if (userIds.length)
    db.insert(messageMentions)
      .values(userIds.map((userId) => ({ messageId, userId })))
      .run();
}

export function mentionsOf(messageId: string): string[] {
  return db
    .select({ userId: messageMentions.userId })
    .from(messageMentions)
    .where(eq(messageMentions.messageId, messageId))
    .all()
    .map((r) => r.userId);
}
