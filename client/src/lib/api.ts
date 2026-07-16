/** Thin REST helper. `base` is empty in the browser (same-origin, dev-proxied),
 *  but the mobile app can point at a remote server by setting it. */

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  avatarVersion: number | null;
}

export interface VoiceMember {
  id: string;
  name: string;
  avatarVersion: number | null;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  position: number;
}

export interface Invite {
  code: string;
  createdAt: number;
  createdBy: string;
  /** 0 = unlimited. */
  maxUses: number;
  uses: number;
  expiresAt: number | null;
  revoked: boolean;
  /** Server-computed: still redeemable? Don't re-derive this on the client. */
  active: boolean;
  status: 'active' | 'revoked' | 'expired' | 'used up';
}

export interface MessageView {
  id: string;
  channelId: string;
  content: string;
  createdAt: number;
  editedAt: number | null;
  author: { id: string; username: string; displayName: string; avatarVersion: number | null } | null;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function apiBase(): string {
  if (typeof localStorage !== 'undefined') return localStorage.getItem('serverUrl') ?? '';
  return '';
}

/** `version` doubles as a cache-buster. */
export function avatarUrl(id: string, version: number | null | undefined): string | null {
  if (version == null) return null;
  return `${apiBase()}/api/users/${id}/avatar?v=${version}`;
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

  const res = await fetch(`${apiBase()}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `request failed (${res.status})`);
  return data as T;
}

export const api = {
  info: () => request<{ name: string; needsSetup: boolean }>('/api/info'),

  /** Claim a brand-new instance. Only works while it has no accounts. */
  setup: (body: {
    communityName: string;
    username: string;
    displayName?: string;
    password: string;
  }) =>
    request<{ token: string; user: PublicUser; inviteCode: string; communityName: string }>(
      '/api/setup',
      { method: 'POST', body },
    ),

  renameCommunity: (token: string, communityName: string) =>
    request<{ communityName: string }>('/api/settings', {
      method: 'PATCH',
      body: { communityName },
      token,
    }),

  register: (body: { inviteCode: string; username: string; displayName?: string; password: string }) =>
    request<{ token: string; user: PublicUser }>('/api/auth/register', { method: 'POST', body }),

  login: (body: { username: string; password: string }) =>
    request<{ token: string; user: PublicUser }>('/api/auth/login', { method: 'POST', body }),

  me: (token: string) => request<{ user: PublicUser }>('/api/auth/me', { token }),

  logout: (token: string) => request<{ ok: true }>('/api/auth/logout', { method: 'POST', token }),

  channels: (token: string) => request<{ channels: Channel[] }>('/api/channels', { token }),

  createChannel: (token: string, body: { name: string; type: 'text' | 'voice' }) =>
    request<{ channel: Channel }>('/api/channels', { method: 'POST', body, token }),

  unreads: (token: string) =>
    request<{ unreads: Record<string, number> }>('/api/channels/unreads', { token }),

  markRead: (token: string, channelId: string) =>
    request<{ ok: true }>(`/api/channels/${channelId}/read`, { method: 'POST', token }),

  history: (token: string, channelId: string, before?: number) =>
    request<{ messages: MessageView[] }>(
      `/api/messages/${channelId}${before ? `?before=${before}` : ''}`,
      { token },
    ),

  deleteMessage: (token: string, id: string) =>
    request<{ ok: true }>(`/api/messages/${id}`, { method: 'DELETE', token }),

  createInvite: (token: string, body: { maxUses?: number; expiresInHours?: number } = {}) =>
    request<{ invite: Invite }>('/api/invites', { method: 'POST', body, token }),

  invites: (token: string) => request<{ invites: Invite[] }>('/api/invites', { token }),

  revokeInvite: (token: string, code: string) =>
    request<{ invite: Invite }>(`/api/invites/${encodeURIComponent(code)}/revoke`, {
      method: 'POST',
      token,
    }),

  members: (token: string) =>
    request<{ members: Array<PublicUser & { banned: number; mutedUntil: number | null }> }>(
      '/api/moderation/members',
      { token },
    ),

  mod: (token: string, id: string, action: 'kick' | 'ban' | 'unban' | 'mute' | 'unmute', body?: unknown) =>
    request<{ ok: true }>(`/api/moderation/${id}/${action}`, { method: 'POST', body, token }),

  voiceToken: (token: string, channelId: string) =>
    request<{ token: string; url: string; room: string; canPublish: boolean }>(
      '/api/voice/token',
      { method: 'POST', body: { channelId }, token },
    ),

  updateProfile: (token: string, body: { displayName: string }) =>
    request<{ user: PublicUser }>('/api/users/me', { method: 'PATCH', body, token }),

  changePassword: (token: string, body: { currentPassword: string; newPassword: string }) =>
    request<{ ok: true }>('/api/users/me/password', { method: 'POST', body, token }),

  uploadAvatar: (token: string, image: string) =>
    request<{ avatarVersion: number }>('/api/users/me/avatar', { method: 'POST', body: { image }, token }),

  removeAvatar: (token: string) =>
    request<{ ok: true }>('/api/users/me/avatar', { method: 'DELETE', token }),
};
