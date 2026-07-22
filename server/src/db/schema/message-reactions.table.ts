import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { messagesTable } from "./messages.table";

export const messageReactionsTable = sqliteTable(
  "message_reactions",
  {
    id: text("id"),
    emoji: text("emoji").notNull(),
    messageId: text("message_id")
      .notNull()
      .references(() => messagesTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.messageId, t.emoji, t.userId] }),
  }),
);
