import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const invitesTable = sqliteTable("invites", {
  code: text("code").primaryKey(),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at").notNull(),
  // How many times this code may be redeemed. 0 = unlimited.
  maxUses: integer("max_uses").notNull().default(1),
  uses: integer("uses").notNull().default(0),
  // Epoch ms; null = never expires.
  expiresAt: integer("expires_at"),
  revoked: integer("revoked").notNull().default(0),
});
