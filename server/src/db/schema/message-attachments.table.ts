import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { messagesTable } from "./messages.table";

/** Any file hung off a message. Images are just attachments the server sniffed
 *  as an image: they keep `width`/`height` and render inline, everything else is
 *  a download. `messageId` is null between upload and the message that claims it;
 *  `expiresAt` is set only on files large enough for the sweeper to reclaim. */
export const messageAttachmentsTable = sqliteTable(
  "message_attachments",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id").references(() => messagesTable.id, {
      onDelete: "cascade",
    }),
    uploaderId: text("uploader_id").notNull(),
    filename: text("filename").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    mime: text("mime").notNull(),
    // 1 when the server sniffed the bytes as a real image. The one field the
    // inline-vs-download decision trusts, so a lie in `mime` can't force inline.
    image: integer("image").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at"),
  },
  (t) => ({
    byMessage: index("idx_message_attachments_message").on(t.messageId),
    byExpiry: index("idx_message_attachments_expiry").on(t.expiresAt),
  }),
);

export type MessageAttachmentRow = typeof messageAttachmentsTable.$inferSelect;
