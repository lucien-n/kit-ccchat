import { Permission } from "@ccchat/shared";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "./db/index.js";
import { roles, userRoles } from "./db/schema";

/** The minimum a user row needs for an authorization decision. */
type AuthUser = { id: string; isOwner: number };

export function isOwner(user: { isOwner: number }): boolean {
  return user.isOwner === 1;
}

/** Does the user hold any role that grants admin? One indexed lookup - cheap at
 *  this scale, and computing it on demand means nothing to keep in sync when
 *  role assignments change. */
export function hasAdminRole(userId: string): boolean {
  const row = db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(roles.permission, Permission.Admin)))
    .get();
  return !!row;
}

export function isAdmin(user: AuthUser): boolean {
  return isOwner(user) || hasAdminRole(user.id);
}

/** owner 2 > admin 1 > member 0. Used to stop anyone moderating their own rank
 *  or above. */
export function authLevel(user: AuthUser): number {
  return isOwner(user) ? 2 : hasAdminRole(user.id) ? 1 : 0;
}

/** Name color: the highest-position role of the user's that actually has a color. */
export function colorFor(userId: string): string | null {
  const row = db
    .select({ color: roles.color })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), isNotNull(roles.color)))
    .orderBy(desc(roles.position))
    .get();
  return row?.color ?? null;
}

export function roleIdsOf(userId: string): string[] {
  return db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .all()
    .map((r) => r.roleId);
}
