import type { CreateChannelBody, RenameChannelBody } from "@ccchat/shared";
import { client } from "./http";

export const channels = {
  list: async () => (await client.api.channels.$get()).json(),

  create: async (body: CreateChannelBody) =>
    (await client.api.channels.$post({ json: body })).json(),

  rename: async (id: string, body: RenameChannelBody) =>
    (await client.api.channels[":id"].$patch({ param: { id }, json: body })).json(),

  delete: async (id: string) =>
    (await client.api.channels[":id"].$delete({ param: { id } })).json(),

  /** Channels top-to-bottom as shown in the sidebar; the server rewrites all
   *  positions from this order. */
  reorder: async (orderedIds: string[]) =>
    (await client.api.channels.order.$put({ json: { orderedIds } })).json(),

  setMain: async (id: string) =>
    (await client.api.channels[":id"].main.$post({ param: { id } })).json(),

  unreads: async () => (await client.api.channels.unreads.$get()).json(),

  markRead: async (id: string) =>
    (await client.api.channels[":id"].read.$post({ param: { id } })).json(),
};
