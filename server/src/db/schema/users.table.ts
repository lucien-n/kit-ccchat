import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  // 'owner' | 'admin' | 'member' - drives moderation permissions.
  role: text("role").notNull().default("member"),
  createdAt: integer("created_at").notNull(),
  // Epoch ms until which the user is muted (cannot send). null/absent = not muted.
  mutedUntil: integer("muted_until"),
  // 1 = banned (cannot log in or connect).
  banned: integer("banned").notNull().default(0),
  // Epoch ms of the last avatar upload; null = no avatar. Doubles as a
  // cache-busting version for the avatar URL.
  avatarVersion: integer("avatar_version"),
});

export type User = typeof users.$inferSelect;
