/** Thin REST helper. `base` is empty in the browser (same-origin, dev-proxied),
 *  but the mobile app can point at a remote server by setting it. */

export type {
  Channel,
  Invite,
  Member,
  MessageView,
  ModeratedMember,
  Role,
  SystemStats,
  VoiceMember,
} from "@ccchat/shared";

export type ModAction = "kick" | "ban" | "unban" | "mute" | "unmute";

import type {
  ChangePasswordBody,
  Channel,
  CreateChannelBody,
  CreateInviteBody,
  CreateRoleBody,
  Invite,
  LoginBody,
  Member,
  MessageView,
  ModeratedMember,
  RegisterBody,
  Role,
  SetupBody,
  SystemStats,
  UpdateProfileBody,
  UpdateRoleBody,
} from "@ccchat/shared";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function apiBase(): string {
  if (typeof localStorage !== "undefined") return localStorage.getItem("serverUrl") ?? "";
  return "";
}

/** `version` doubles as a cache-buster. */
export function avatarUrl(id: string, version: number | null | undefined): string | null {
  if (version == null) return null;
  return `${apiBase()}/api/users/${id}/avatar?v=${version}`;
}

/** null when the community has no icon, so callers fall back to the bundled one. */
export function communityIconUrl(version: number | null | undefined): string | null {
  if (version == null) return null;
  return `${apiBase()}/api/settings/icon?v=${version}`;
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const res = await fetch(`${apiBase()}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok)
    throw new ApiError(res.status, data?.error ?? `request failed (${res.status})`);
  return data as T;
}

export const api = {
  info: () =>
    request<{ name: string; needsSetup: boolean; iconVersion: number | null }>(
      "/api/info",
    ),

  setCommunityIcon: (token: string, image: string) =>
    request<{ iconVersion: number }>("/api/settings/icon", {
      method: "POST",
      body: { image },
      token,
    }),

  removeCommunityIcon: (token: string) =>
    request<{ ok: true }>("/api/settings/icon", { method: "DELETE", token }),

  /** Claim a brand-new instance. Only works while it has no accounts. */
  setup: (body: SetupBody) =>
    request<{
      token: string;
      user: Member;
      inviteCode: string;
      communityName: string;
    }>("/api/setup", { method: "POST", body }),

  renameCommunity: (token: string, communityName: string) =>
    request<{ communityName: string }>("/api/settings", {
      method: "PATCH",
      body: { communityName },
      token,
    }),

  register: (body: RegisterBody) =>
    request<{ token: string; user: Member }>("/api/auth/register", {
      method: "POST",
      body,
    }),

  login: (body: LoginBody) =>
    request<{ token: string; user: Member }>("/api/auth/login", {
      method: "POST",
      body,
    }),

  me: (token: string) => request<{ user: Member }>("/api/auth/me", { token }),

  logout: (token: string) =>
    request<{ ok: true }>("/api/auth/logout", { method: "POST", token }),

  channels: (token: string) =>
    request<{ channels: Channel[] }>("/api/channels", { token }),

  createChannel: (token: string, body: CreateChannelBody) =>
    request<{ channel: Channel }>("/api/channels", {
      method: "POST",
      body,
      token,
    }),

  unreads: (token: string) =>
    request<{ unreads: Record<string, number> }>("/api/channels/unreads", {
      token,
    }),

  markRead: (token: string, channelId: string) =>
    request<{ ok: true }>(`/api/channels/${channelId}/read`, {
      method: "POST",
      token,
    }),

  history: (token: string, channelId: string, before?: number, limit?: number) => {
    const q = new URLSearchParams();
    if (before) q.set("before", String(before));
    if (limit) q.set("limit", String(limit));
    const qs = q.toString();
    return request<{ messages: MessageView[] }>(
      `/api/messages/${channelId}${qs ? `?${qs}` : ""}`,
      { token },
    );
  },

  editMessage: (token: string, id: string, content: string) =>
    request<{ message: MessageView }>(`/api/messages/${id}`, {
      method: "PATCH",
      body: { content },
      token,
    }),

  deleteMessage: (token: string, id: string) =>
    request<{ ok: true }>(`/api/messages/${id}`, { method: "DELETE", token }),

  createInvite: (token: string, body: Partial<CreateInviteBody> = {}) =>
    request<{ invite: Invite }>("/api/invites", {
      method: "POST",
      body,
      token,
    }),

  invites: (token: string) => request<{ invites: Invite[] }>("/api/invites", { token }),

  revokeInvite: (token: string, code: string) =>
    request<{ invite: Invite }>(`/api/invites/${encodeURIComponent(code)}/revoke`, {
      method: "POST",
      token,
    }),

  /** Full community roster, readable by any member (no moderation state). */
  roster: (token: string) => request<{ members: Member[] }>("/api/users", { token }),

  /** Moderation view of members (admin only): includes banned/muted + roleIds. */
  members: (token: string) =>
    request<{ members: ModeratedMember[] }>("/api/moderation/members", { token }),

  /** A single user's profile card: public identity + the roles they hold. */
  userProfile: (token: string, id: string) =>
    request<{ user: Member; roles: Role[] }>(`/api/users/${id}`, { token }),

  mod: (token: string, id: string, action: ModAction, body?: unknown) =>
    request<{ ok: true }>(`/api/moderation/${id}/${action}`, {
      method: "POST",
      body,
      token,
    }),

  /** Host machine snapshot (owner only). */
  system: (token: string) => request<{ stats: SystemStats }>("/api/system", { token }),

  voiceToken: (token: string, channelId: string) =>
    request<{ token: string; url: string; room: string; canPublish: boolean }>(
      "/api/voice/token",
      { method: "POST", body: { channelId }, token },
    ),

  updateProfile: (token: string, body: UpdateProfileBody) =>
    request<{ user: Member }>("/api/users/me", {
      method: "PATCH",
      body,
      token,
    }),

  changePassword: (token: string, body: ChangePasswordBody) =>
    request<{ ok: true }>("/api/users/me/password", {
      method: "POST",
      body,
      token,
    }),

  uploadAvatar: (token: string, image: string) =>
    request<{ avatarVersion: number }>("/api/users/me/avatar", {
      method: "POST",
      body: { image },
      token,
    }),

  removeAvatar: (token: string) =>
    request<{ ok: true }>("/api/users/me/avatar", { method: "DELETE", token }),

  roles: (token: string) => request<{ roles: Role[] }>("/api/roles", { token }),

  createRole: (token: string, body: CreateRoleBody) =>
    request<{ role: Role }>("/api/roles", { method: "POST", body, token }),

  updateRole: (token: string, id: string, body: UpdateRoleBody) =>
    request<{ role: Role }>(`/api/roles/${id}`, { method: "PATCH", body, token }),

  deleteRole: (token: string, id: string) =>
    request<{ ok: true }>(`/api/roles/${id}`, { method: "DELETE", token }),

  /** Roles top-to-bottom (highest precedence first); the server rewrites all
   *  positions from this order. */
  reorderRoles: (token: string, orderedIds: string[]) =>
    request<{ ok: true }>("/api/roles/order", {
      method: "PUT",
      body: { orderedIds },
      token,
    }),

  /** Replace a member's full set of roles. */
  setUserRoles: (token: string, userId: string, roleIds: string[]) =>
    request<{ ok: true }>(`/api/roles/members/${userId}`, {
      method: "PUT",
      body: { roleIds },
      token,
    }),
};
