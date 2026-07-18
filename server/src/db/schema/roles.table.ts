import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // Hex like #rrggbb, or null for no color (name renders in the default fg).
  color: text("color"),
  // 'admin' | 'member' - the authorization this role grants. 'member' is the
  // baseline, so a member-permission role is purely cosmetic.
  permission: text("permission").notNull().default("member"),
  // Higher wins: display color comes from the user's highest-position colored role.
  position: integer("position").notNull(),
  createdAt: integer("created_at").notNull(),
});

export type Role = typeof roles.$inferSelect;
