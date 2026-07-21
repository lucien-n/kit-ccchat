import type { CreateRoleBody, UpdateRoleBody } from "@ccchat/shared";
import { client } from "./http";

export const roles = {
  list: async () => (await client.api.roles.$get()).json(),

  create: async (body: CreateRoleBody) =>
    (await client.api.roles.$post({ json: body })).json(),

  update: async (id: string, body: UpdateRoleBody) =>
    (await client.api.roles[":id"].$patch({ param: { id }, json: body })).json(),

  delete: async (id: string) =>
    (await client.api.roles[":id"].$delete({ param: { id } })).json(),

  /** Roles top-to-bottom (highest precedence first); the server rewrites all
   *  positions from this order. */
  reorder: async (orderedIds: string[]) =>
    (await client.api.roles.order.$put({ json: { orderedIds } })).json(),

  /** Replace a member's full set of roles. */
  setForUser: async (userId: string, roleIds: string[]) =>
    (
      await client.api.roles.members[":userId"].$put({
        param: { userId },
        json: { roleIds },
      })
    ).json(),
};
