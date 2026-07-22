import { index, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { messagesTable } from "./messages.table";

export const messageMentionsTable = sqliteTable(
  "message_mentions",
  {
    messageId: text("message_id")
      .notNull()
      .references(() => messagesTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.messageId, t.userId] }),
    byUser: index("idx_message_mentions_user").on(t.userId),
  }),
);
