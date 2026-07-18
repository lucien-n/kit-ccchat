import { Permission } from "@ccchat/shared";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "./db/index.js";
import { roles, userRoles } from "./db/schema";

type AuthUser = { id: string; isOwner: number };

export function isOwner(user: { isOwner: number }): boolean {
  return user.isOwner === 1;
}

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

export function authLevel(user: AuthUser): number {
  return isOwner(user) ? 2 : hasAdminRole(user.id) ? 1 : 0;
}

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
