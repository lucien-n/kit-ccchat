import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const channels = sqliteTable("channels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("text"), // 'text' | 'voice'
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export type Channel = typeof channels.$inferSelect;
