import type { CreateChannelBody } from "@ccchat/shared";
import { client } from "./http";

export const channels = {
  list: async () => (await client.api.channels.$get()).json(),

  create: async (body: CreateChannelBody) =>
    (await client.api.channels.$post({ json: body })).json(),

  delete: async (id: string) =>
    (await client.api.channels[":id"].$delete({ param: { id } })).json(),

  unreads: async () => (await client.api.channels.unreads.$get()).json(),

  markRead: async (id: string) =>
    (await client.api.channels[":id"].read.$post({ param: { id } })).json(),
};
