import {
  ServerEventType,
  type CreateRoleBody,
  type Role,
  type UpdateRoleBody,
} from "@ccchat/shared";
import { desc, eq, inArray } from "drizzle-orm";
import { newId } from "../../auth.js";
import { db } from "../../db/index.js";
import { roles, userRoles, users, type User } from "../../db/schema";
import { httpError } from "../../http/errors.js";
import { hub } from "../../hub.js";
import { authLevel } from "../../permissions.js";
import { toRoleView } from "../../views.js";

const notify = () => hub.broadcast({ type: ServerEventType.Roles_Changed });

export function listRoles(): Role[] {
  return db.select().from(roles).orderBy(desc(roles.position)).all().map(toRoleView);
}

export function createRole({ name, color, permission }: CreateRoleBody): Role {
  const role = {
    id: newId(),
    name,
    color,
    permission,
    position: db.select().from(roles).all().length,
    createdAt: Date.now(),
  };
  db.insert(roles).values(role).run();
  notify();
  return toRoleView(role);
}

export function updateRole(id: string, patch: UpdateRoleBody): Role {
  const existing = db.select().from(roles).where(eq(roles.id, id)).get();
  if (!existing) httpError(404, "role not found");

  db.update(roles).set(patch).where(eq(roles.id, id)).run();
  notify();
  return toRoleView({ ...existing, ...patch });
}

/** Reassign every position from the given order, so the list can't drift into
 *  duplicate positions and the top role always wins the color. */
export function reorderRoles(orderedIds: string[]) {
  const known = new Set(
    db
      .select({ id: roles.id })
      .from(roles)
      .all()
      .map((r) => r.id),
  );
  const ids = orderedIds.filter((id) => known.has(id));
  db.transaction((tx) => {
    ids.forEach((id, i) => {
      tx.update(roles)
        .set({ position: ids.length - 1 - i })
        .where(eq(roles.id, id))
        .run();
    });
  });
  notify();
}

export function deleteRole(id: string) {
  db.transaction((tx) => {
    tx.delete(userRoles).where(eq(userRoles.roleId, id)).run();
    tx.delete(roles).where(eq(roles.id, id)).run();
  });
  notify();
}

export function setUserRoles(userId: string, roleIds: string[], actor: User) {
  const target = db.select().from(users).where(eq(users.id, userId)).get();
  if (!target) httpError(404, "user not found");
  if (authLevel(target) > authLevel(actor)) httpError(403, "target outranks you");

  if (roleIds.length) {
    const found = db
      .select({ id: roles.id })
      .from(roles)
      .where(inArray(roles.id, roleIds))
      .all();
    if (found.length !== new Set(roleIds).size) httpError(400, "unknown role");
  }

  db.transaction((tx) => {
    tx.delete(userRoles).where(eq(userRoles.userId, userId)).run();
    if (roleIds.length)
      tx.insert(userRoles)
        .values(roleIds.map((roleId) => ({ userId, roleId })))
        .run();
  });
  notify();
}
