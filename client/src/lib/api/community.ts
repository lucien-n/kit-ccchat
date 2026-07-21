import { apiBase, publicRequest, request } from "./http";

/** null when the community has no icon, so callers fall back to the bundled one. */
export function communityIconUrl(version: number | null | undefined): string | null {
  if (version == null) return null;
  return `${apiBase()}/api/settings/icon?v=${version}`;
}

export const community = {
  info: () =>
    publicRequest<{ name: string; needsSetup: boolean; iconVersion: number | null }>(
      "/api/info",
    ),

  rename: (communityName: string) =>
    request<{ communityName: string }>("/api/settings", {
      method: "PATCH",
      body: { communityName },
    }),

  setIcon: (image: string) =>
    request<{ iconVersion: number }>("/api/settings/icon", {
      method: "POST",
      body: { image },
    }),

  removeIcon: () => request<{ ok: true }>("/api/settings/icon", { method: "DELETE" }),
};
