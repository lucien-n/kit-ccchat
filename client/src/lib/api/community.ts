import { apiBase, client, publicClient } from "./http";

/** null when the community has no icon, so callers fall back to the bundled one. */
export function communityIconUrl(version: number | null | undefined): string | null {
  if (version == null) return null;
  return `${apiBase()}/api/settings/icon?v=${version}`;
}

export const community = {
  info: async () => (await publicClient.api.info.$get()).json(),

  rename: async (communityName: string) =>
    (await client.api.settings.$patch({ json: { communityName } })).json(),

  setIcon: async (image: string) =>
    (await client.api.settings.icon.$post({ json: { image } })).json(),

  removeIcon: async () => (await client.api.settings.icon.$delete()).json(),
};
