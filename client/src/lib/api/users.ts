import type { ChangePasswordBody, Member, Role, UpdateProfileBody } from "@ccchat/shared";
import { apiBase, request } from "./http";

/** `version` doubles as a cache-buster. */
export function avatarUrl(id: string, version: number | null | undefined): string | null {
  if (version == null) return null;
  return `${apiBase()}/api/users/${id}/avatar?v=${version}`;
}

export const users = {
  /** Full community roster, readable by any member (no moderation state). */
  list: () => request<{ members: Member[] }>("/api/users"),

  /** A single user's profile card: public identity + the roles they hold. */
  profile: (id: string) => request<{ user: Member; roles: Role[] }>(`/api/users/${id}`),

  updateMe: (body: UpdateProfileBody) =>
    request<{ user: Member }>("/api/users/me", { method: "PATCH", body }),

  changePassword: (body: ChangePasswordBody) =>
    request<{ ok: true }>("/api/users/me/password", { method: "POST", body }),

  setAvatar: (image: string) =>
    request<{ avatarVersion: number }>("/api/users/me/avatar", {
      method: "POST",
      body: { image },
    }),

  removeAvatar: () => request<{ ok: true }>("/api/users/me/avatar", { method: "DELETE" }),
};
