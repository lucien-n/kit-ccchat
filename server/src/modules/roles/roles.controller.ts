import type {
  CreateRoleBody,
  ReorderRolesBody,
  SetUserRolesBody,
  UpdateRoleBody,
} from "@ccchat/shared";
import type { AppContext, JsonContext } from "../../http/context.js";
import * as rolesService from "./roles.service.js";

export function list(c: AppContext) {
  return c.json({ roles: rolesService.listRoles() });
}

export function create(c: JsonContext<CreateRoleBody>) {
  return c.json({ role: rolesService.createRole(c.req.valid("json")) });
}

export function update(c: JsonContext<UpdateRoleBody>) {
  const role = rolesService.updateRole(String(c.req.param("id")), c.req.valid("json"));
  return c.json({ role });
}

export function reorder(c: JsonContext<ReorderRolesBody>) {
  rolesService.reorderRoles(c.req.valid("json").orderedIds);
  return c.json({ ok: true });
}

export function remove(c: AppContext) {
  rolesService.deleteRole(String(c.req.param("id")));
  return c.json({ ok: true });
}

export function setForUser(c: JsonContext<SetUserRolesBody>) {
  rolesService.setUserRoles(
    String(c.req.param("userId")),
    c.req.valid("json").roleIds,
    c.get("user"),
  );
  return c.json({ ok: true });
}
