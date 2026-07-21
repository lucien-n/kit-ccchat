import type { CreateInviteBody } from "@ccchat/shared";
import { client } from "./http";

export const invites = {
  list: async () => (await client.api.invites.$get()).json(),

  create: async (body: Partial<CreateInviteBody> = {}) =>
    (await client.api.invites.$post({ json: body })).json(),

  revoke: async (code: string) =>
    (await client.api.invites[":code"].revoke.$post({ param: { code } })).json(),
};
