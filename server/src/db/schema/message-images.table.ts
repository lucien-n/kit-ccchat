import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { messagesTable } from "./messages.table";

export const messageImagesTable = sqliteTable(
  "message_images",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id").references(() => messagesTable.id, {
      onDelete: "cascade",
    }),
    uploaderId: text("uploader_id").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({ byMessage: index("idx_message_images_message").on(t.messageId) }),
);

export type MessageImageRow = typeof messageImagesTable.$inferSelect;
