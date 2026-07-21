import type { ModeratedMember } from "@ccchat/shared";
import { request } from "./http";

export type ModAction = "kick" | "ban" | "unban" | "mute" | "unmute";

export const moderation = {
  /** Moderation view of members (admin only): includes banned/muted + roleIds. */
  members: () => request<{ members: ModeratedMember[] }>("/api/moderation/members"),

  act: (userId: string, action: ModAction, body?: unknown) =>
    request<{ ok: true }>(`/api/moderation/${userId}/${action}`, {
      method: "POST",
      body,
    }),
};
