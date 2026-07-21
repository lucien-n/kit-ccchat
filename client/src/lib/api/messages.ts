import type { MessageView, MessageWindow } from "@ccchat/shared";
import { request } from "./http";

export const messages = {
  history: (
    channelId: string,
    query: { before?: number; after?: number; limit?: number } = {},
  ) => request<{ messages: MessageView[] }>(`/api/messages/${channelId}`, { query }),

  around: (channelId: string, messageId: string, limit?: number) =>
    request<MessageWindow>(`/api/messages/${channelId}/around/${messageId}`, {
      query: { limit },
    }),

  edit: (id: string, content: string) =>
    request<{ message: MessageView }>(`/api/messages/${id}`, {
      method: "PATCH",
      body: { content },
    }),

  delete: (id: string) =>
    request<{ ok: true }>(`/api/messages/${id}`, { method: "DELETE" }),
};
