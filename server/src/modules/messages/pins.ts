import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { messagePinsTable, messagesTable, type Message } from "../../db/schema";

export function isPinned(messageId: string): boolean {
  const row = db
    .select({ messageId: messagePinsTable.messageId })
    .from(messagePinsTable)
    .where(eq(messagePinsTable.messageId, messageId))
    .get();
  return !!row;
}

export function pinCount(channelId: string): number {
  return (
    db
      .select({ n: count() })
      .from(messagePinsTable)
      .where(eq(messagePinsTable.channelId, channelId))
      .get()?.n ?? 0
  );
}

/** A channel's pinned messages, newest pin first. A pin whose message was
 *  soft-deleted is skipped: the cascade only fires on a hard delete. The rows
 *  are handed back for the caller to turn into views - this stays clear of the
 *  view layer to avoid an import cycle. */
export function pinnedRows(channelId: string): Message[] {
  return db
    .select({ message: messagesTable })
    .from(messagePinsTable)
    .innerJoin(messagesTable, eq(messagePinsTable.messageId, messagesTable.id))
    .where(and(eq(messagePinsTable.channelId, channelId), eq(messagesTable.deleted, 0)))
    .orderBy(desc(messagePinsTable.pinnedAt))
    .all()
    .map((r) => r.message);
}
