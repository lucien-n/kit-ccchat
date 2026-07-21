import type { Channel, CreateChannelBody } from "@ccchat/shared";
import { request } from "./http";

export const channels = {
  list: () => request<{ channels: Channel[] }>("/api/channels"),

  create: (body: CreateChannelBody) =>
    request<{ channel: Channel }>("/api/channels", { method: "POST", body }),

  delete: (id: string) =>
    request<{ ok: true }>(`/api/channels/${id}`, { method: "DELETE" }),

  unreads: () => request<{ unreads: Record<string, number> }>("/api/channels/unreads"),

  markRead: (id: string) =>
    request<{ ok: true }>(`/api/channels/${id}/read`, { method: "POST" }),
};
