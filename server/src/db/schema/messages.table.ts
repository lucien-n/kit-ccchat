import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id").notNull(),
    authorId: text("author_id").notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at").notNull(),
    editedAt: integer("edited_at"),
    deleted: integer("deleted").notNull().default(0),
    replyToId: text("reply_to_id"),
    systemEvent: text("system_event"),
  },
  (t) => ({ byChannel: index("idx_messages_channel").on(t.channelId, t.createdAt) }),
);

export type Message = typeof messages.$inferSelect;
