import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { channels } from "./channels.table";

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull(),
    content: text("content").notNull(),
    createdAt: integer("created_at").notNull(),
    editedAt: integer("edited_at"),
    deleted: integer("deleted").notNull().default(0),
    replyToId: text("reply_to_id"),
    systemEvent: text("system_event"),
    // 1 = pings every member. Kept as a flag rather than a row per member in
    // message_mentions, which would be one write per member per @everyone.
    mentionsEveryone: integer("mentions_everyone").notNull().default(0),
  },
  (t) => ({ byChannel: index("idx_messages_channel").on(t.channelId, t.createdAt) }),
);

export type Message = typeof messages.$inferSelect;
