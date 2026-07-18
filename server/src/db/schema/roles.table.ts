import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color"),
  permission: text("permission").notNull().default("member"),
  position: integer("position").notNull(),
  createdAt: integer("created_at").notNull(),
});

export type Role = typeof roles.$inferSelect;
