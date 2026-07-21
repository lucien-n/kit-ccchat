import { client } from "./http";

export const voice = {
  token: async (channelId: string) =>
    (await client.api.voice.token.$post({ json: { channelId } })).json(),
};
