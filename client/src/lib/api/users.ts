import type { ChangePasswordBody, UpdateProfileBody } from "@ccchat/shared";
import { apiBase, client } from "./http";

/** `version` doubles as a cache-buster. */
export function avatarUrl(id: string, version: number | null | undefined): string | null {
  if (version == null) return null;
  return `${apiBase()}/api/users/${id}/avatar?v=${version}`;
}

export const users = {
  /** Full community roster, readable by any member (no moderation state). */
  list: async () => (await client.api.users.$get()).json(),

  /** A single user's profile card: public identity + the roles they hold. */
  profile: async (id: string) =>
    (await client.api.users[":id"].$get({ param: { id } })).json(),

  updateMe: async (body: UpdateProfileBody) =>
    (await client.api.users.me.$patch({ json: body })).json(),

  changePassword: async (body: ChangePasswordBody) =>
    (await client.api.users.me.password.$post({ json: body })).json(),

  setAvatar: async (image: string) =>
    (await client.api.users.me.avatar.$post({ json: { image } })).json(),

  removeAvatar: async () => (await client.api.users.me.avatar.$delete()).json(),
};
