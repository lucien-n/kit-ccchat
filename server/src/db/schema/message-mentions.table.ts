import { index, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const messageMentions = sqliteTable(
  "message_mentions",
  {
    messageId: text("message_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.messageId, t.userId] }),
    byUser: index("idx_message_mentions_user").on(t.userId),
  }),
);
