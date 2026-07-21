import { request } from "./http";

export const voice = {
  token: (channelId: string) =>
    request<{ token: string; url: string; room: string; canPublish: boolean }>(
      "/api/voice/token",
      { method: "POST", body: { channelId } },
    ),
};
