import type { MessageHistoryQuery } from "@ccchat/shared";
import { client } from "./http";

export const messages = {
  history: async (channelId: string, query: Partial<MessageHistoryQuery> = {}) =>
    (
      await client.api.messages[":channelId"].$get({ param: { channelId }, query })
    ).json(),

  around: async (channelId: string, messageId: string, limit?: number) =>
    (
      await client.api.messages[":channelId"].around[":messageId"].$get({
        param: { channelId, messageId },
        query: { limit },
      })
    ).json(),

  edit: async (id: string, content: string) =>
    (
      await client.api.messages[":id"].$patch({ param: { id }, json: { content } })
    ).json(),

  delete: async (id: string) =>
    (await client.api.messages[":id"].$delete({ param: { id } })).json(),

  react: async (id: string, emoji: string) =>
    await client.api.messages[":id"].reactions[":emoji"].$put({ param: { id, emoji } }),

  unreact: async (id: string, emoji: string) =>
    await client.api.messages[":id"].reactions[":emoji"].$delete({
      param: { id, emoji },
    }),
};
