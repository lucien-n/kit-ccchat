import {
  createRoleBody,
  reorderRolesBody,
  setUserRolesBody,
  updateRoleBody,
} from "@ccchat/shared";
import type { AppContext, JsonContext } from "../../http/context.js";
import * as rolesService from "./roles.service.js";

export function list(c: AppContext) {
  return c.json({ roles: rolesService.listRoles() });
}

export function create(c: JsonContext<typeof createRoleBody>) {
  return c.json({ role: rolesService.createRole(c.req.valid("json")) });
}

export function update(c: JsonContext<typeof updateRoleBody>) {
  const role = rolesService.updateRole(String(c.req.param("id")), c.req.valid("json"));
  return c.json({ role });
}

export function reorder(c: JsonContext<typeof reorderRolesBody>) {
  rolesService.reorderRoles(c.req.valid("json").orderedIds);
  return c.json({ ok: true });
}

export function remove(c: AppContext) {
  rolesService.deleteRole(String(c.req.param("id")));
  return c.json({ ok: true });
}

export function setForUser(c: JsonContext<typeof setUserRolesBody>) {
  rolesService.setUserRoles(
    String(c.req.param("userId")),
    c.req.valid("json").roleIds,
    c.get("user"),
  );
  return c.json({ ok: true });
}
