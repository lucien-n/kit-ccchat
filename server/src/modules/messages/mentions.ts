import { parseMentions } from "@ccchat/shared";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { messageMentionsTable, userRolesTable, usersTable } from "../../db/schema";

export interface ResolvedMentions {
  userIds: string[];
  everyone: boolean;
}

export function resolveMentions(content: string, authorId: string): ResolvedMentions {
  const { usernames, roleIds, everyone } = parseMentions(content);
  const found = new Set<string>();

  if (usernames.length) {
    for (const u of db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(inArray(usersTable.username, usernames))
      .all())
      found.add(u.id);
  }

  if (roleIds.length) {
    for (const r of db
      .select({ userId: userRolesTable.userId })
      .from(userRolesTable)
      .where(inArray(userRolesTable.roleId, roleIds))
      .all())
      found.add(r.userId);
  }

  found.delete(authorId);
  return { userIds: [...found], everyone };
}

export function saveMentions(messageId: string, userIds: string[]) {
  db.delete(messageMentionsTable)
    .where(eq(messageMentionsTable.messageId, messageId))
    .run();
  if (userIds.length)
    db.insert(messageMentionsTable)
      .values(userIds.map((userId) => ({ messageId, userId })))
      .run();
}

export function mentionsOf(messageId: string): string[] {
  return db
    .select({ userId: messageMentionsTable.userId })
    .from(messageMentionsTable)
    .where(eq(messageMentionsTable.messageId, messageId))
    .all()
    .map((r) => r.userId);
}
