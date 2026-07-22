import {
  ServerEventType,
  type CreateRoleBody,
  type Role,
  type UpdateRoleBody,
} from "@ccchat/shared";
import { desc, eq, inArray } from "drizzle-orm";
import { newId } from "../../auth.js";
import { db } from "../../db/index.js";
import { rolesTable, userRolesTable, usersTable, type User } from "../../db/schema";
import { httpError } from "../../http/errors.js";
import { hub } from "../../hub.js";
import { authLevel } from "../../permissions.js";
import { toRoleView } from "../../views.js";

const notify = () => hub.broadcast({ type: ServerEventType.Roles_Changed });

export function listRoles(): Role[] {
  return db
    .select()
    .from(rolesTable)
    .orderBy(desc(rolesTable.position))
    .all()
    .map(toRoleView);
}

export function createRole({ name, color, permission }: CreateRoleBody): Role {
  const role = {
    id: newId(),
    name,
    color,
    permission,
    position: db.select().from(rolesTable).all().length,
    createdAt: Date.now(),
  };
  db.insert(rolesTable).values(role).run();
  notify();
  return toRoleView(role);
}

export function updateRole(id: string, patch: UpdateRoleBody): Role {
  const existing = db.select().from(rolesTable).where(eq(rolesTable.id, id)).get();
  if (!existing) httpError(404, "role not found");

  db.update(rolesTable).set(patch).where(eq(rolesTable.id, id)).run();
  notify();
  return toRoleView({ ...existing, ...patch });
}

/** Reassign every position from the given order, so the list can't drift into
 *  duplicate positions and the top role always wins the color. */
export function reorderRoles(orderedIds: string[]) {
  const known = new Set(
    db
      .select({ id: rolesTable.id })
      .from(rolesTable)
      .all()
      .map((r) => r.id),
  );
  const ids = orderedIds.filter((id) => known.has(id));
  db.transaction((tx) => {
    ids.forEach((id, i) => {
      tx.update(rolesTable)
        .set({ position: ids.length - 1 - i })
        .where(eq(rolesTable.id, id))
        .run();
    });
  });
  notify();
}

export function deleteRole(id: string) {
  db.transaction((tx) => {
    tx.delete(userRolesTable).where(eq(userRolesTable.roleId, id)).run();
    tx.delete(rolesTable).where(eq(rolesTable.id, id)).run();
  });
  notify();
}

export function setUserRoles(userId: string, roleIds: string[], actor: User) {
  const target = db.select().from(usersTable).where(eq(usersTable.id, userId)).get();
  if (!target) httpError(404, "user not found");
  if (authLevel(target) > authLevel(actor)) httpError(403, "target outranks you");

  if (roleIds.length) {
    const found = db
      .select({ id: rolesTable.id })
      .from(rolesTable)
      .where(inArray(rolesTable.id, roleIds))
      .all();
    if (found.length !== new Set(roleIds).size) httpError(400, "unknown role");
  }

  db.transaction((tx) => {
    tx.delete(userRolesTable).where(eq(userRolesTable.userId, userId)).run();
    if (roleIds.length)
      tx.insert(userRolesTable)
        .values(roleIds.map((roleId) => ({ userId, roleId })))
        .run();
  });
  notify();
}
