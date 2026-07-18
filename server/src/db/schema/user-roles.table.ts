import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Many-to-many: a user holds any number of roles. No FK constraints (matching
 *  the rest of the schema); orphans are cleaned up by the role-delete route. */
export const userRoles = sqliteTable(
  "user_roles",
  {
    userId: text("user_id").notNull(),
    roleId: text("role_id").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.roleId] }) }),
);

export type UserRole = typeof userRoles.$inferSelect;
