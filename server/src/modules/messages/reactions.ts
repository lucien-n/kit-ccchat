import type { Reaction } from "@ccchat/shared";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db";
import { messageReactionsTable, type User } from "../../db/schema";

export function reactionsOf(messageId: string): Reaction[] {
  const rows = db
    .select({ emoji: messageReactionsTable.emoji, userId: messageReactionsTable.userId })
    .from(messageReactionsTable)
    .where(eq(messageReactionsTable.messageId, messageId))
    .orderBy(asc(messageReactionsTable.createdAt))
    .all();

  const byEmoji = new Map<Reaction["emoji"], User["id"][]>();
  for (const { emoji, userId } of rows) {
    const seen = byEmoji.get(emoji);
    if (seen) {
      seen.push(userId);
    } else {
      byEmoji.set(emoji, [userId]);
    }
  }

  return [...byEmoji].map(([emoji, userIds]) => ({ emoji, userIds }));
}
