import { index, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { messages } from "./messages.table";

export const messageMentions = sqliteTable(
  "message_mentions",
  {
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.messageId, t.userId] }),
    byUser: index("idx_message_mentions_user").on(t.userId),
  }),
);
