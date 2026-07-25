import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const soundboardSoundsTable = sqliteTable(
  "soundboard_sounds",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    emoji: text("emoji"),
    uploaderId: text("uploader_id").notNull(),
    durationMs: integer("duration_ms").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({ byCreated: index("idx_soundboard_created").on(t.createdAt) }),
);

export type SoundboardSoundRow = typeof soundboardSoundsTable.$inferSelect;
