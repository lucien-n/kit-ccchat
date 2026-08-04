import { z } from "zod";
import { hexColor, permission, Permission, roleName } from "../primitives.js";

export const createRoleBody = z.object({
  name: roleName,
  color: hexColor.nullable().default(null),
  permission: permission.default(Permission.Member),
});
export type CreateRoleBody = z.infer<typeof createRoleBody>;

export const updateRoleBody = z.object({
  name: roleName.optional(),
  color: hexColor.nullable().optional(),
  permission: permission.optional(),
  position: z.number().int().min(0).optional(),
});
export type UpdateRoleBody = z.infer<typeof updateRoleBody>;

export const setUserRolesBody = z.object({
  roleIds: z.array(z.string()),
});

// Roles top-to-bottom as shown to the user (highest precedence first). The
// server reassigns positions from this, so the order is the whole truth and
// positions never collide.
export const reorderRolesBody = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
