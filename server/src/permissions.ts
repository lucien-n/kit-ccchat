import { Permission } from "@ccchat/shared";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "./db/index.js";
import { rolesTable, userRolesTable } from "./db/schema";

type AuthUser = { id: string; isOwner: number };

export function isOwner(user: { isOwner: number }): boolean {
  return user.isOwner === 1;
}

export function hasAdminRole(userId: string): boolean {
  const row = db
    .select({ roleId: userRolesTable.roleId })
    .from(userRolesTable)
    .innerJoin(rolesTable, eq(userRolesTable.roleId, rolesTable.id))
    .where(
      and(eq(userRolesTable.userId, userId), eq(rolesTable.permission, Permission.Admin)),
    )
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
    .select({ color: rolesTable.color })
    .from(userRolesTable)
    .innerJoin(rolesTable, eq(userRolesTable.roleId, rolesTable.id))
    .where(and(eq(userRolesTable.userId, userId), isNotNull(rolesTable.color)))
    .orderBy(desc(rolesTable.position))
    .get();
  return row?.color ?? null;
}

export function roleIdsOf(userId: string): string[] {
  return db
    .select({ roleId: userRolesTable.roleId })
    .from(userRolesTable)
    .where(eq(userRolesTable.userId, userId))
    .all()
    .map((r) => r.roleId);
}
