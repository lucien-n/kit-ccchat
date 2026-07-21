import type { CreateRoleBody, Role, UpdateRoleBody } from "@ccchat/shared";
import { request } from "./http";

export const roles = {
  list: () => request<{ roles: Role[] }>("/api/roles"),

  create: (body: CreateRoleBody) =>
    request<{ role: Role }>("/api/roles", { method: "POST", body }),

  update: (id: string, body: UpdateRoleBody) =>
    request<{ role: Role }>(`/api/roles/${id}`, { method: "PATCH", body }),

  delete: (id: string) => request<{ ok: true }>(`/api/roles/${id}`, { method: "DELETE" }),

  /** Roles top-to-bottom (highest precedence first); the server rewrites all
   *  positions from this order. */
  reorder: (orderedIds: string[]) =>
    request<{ ok: true }>("/api/roles/order", { method: "PUT", body: { orderedIds } }),

  /** Replace a member's full set of roles. */
  setForUser: (userId: string, roleIds: string[]) =>
    request<{ ok: true }>(`/api/roles/members/${userId}`, {
      method: "PUT",
      body: { roleIds },
    }),
};
