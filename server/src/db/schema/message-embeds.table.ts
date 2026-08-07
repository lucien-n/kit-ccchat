import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { messagesTable } from "./messages.table";

// A link preview unfurled from a message's text, created after the message is
// sent. `position` preserves the URLs' order in the text.
export const messageEmbedsTable = sqliteTable(
  "message_embeds",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id")
      .notNull()
      .references(() => messagesTable.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    description: text("description"),
    siteName: text("site_name"),
    // SSRF-validated remote thumbnail URL, kept server-side only - the image
    // proxy re-reads it here so the client's IP never reaches the linked site.
    imageUrl: text("image_url"),
    position: integer("position").notNull(),
    createdAt: integer("created_at").notNull(),
    // Soft-delete: the author dismissed this card. Kept, not hard-deleted, so a
    // re-unfurl on edit doesn't bring the dismissed link back.
    removed: integer("removed").notNull().default(0),
  },
  (t) => ({ byMessage: index("idx_message_embeds_message").on(t.messageId) }),
);

export type MessageEmbedRow = typeof messageEmbedsTable.$inferSelect;
