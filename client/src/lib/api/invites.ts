import type { CreateInviteBody, Invite } from "@ccchat/shared";
import { request } from "./http";

export const invites = {
  list: () => request<{ invites: Invite[] }>("/api/invites"),

  create: (body: Partial<CreateInviteBody> = {}) =>
    request<{ invite: Invite }>("/api/invites", { method: "POST", body }),

  revoke: (code: string) =>
    request<{ invite: Invite }>(`/api/invites/${encodeURIComponent(code)}/revoke`, {
      method: "POST",
    }),
};
