import type { UpdateSoundBody, UploadSoundBody } from "@motus/shared";
import { apiBase, client } from "./http";

export function soundUrl(id: string): string {
  return `${apiBase()}/api/soundboard/${id}`;
}

export const soundboard = {
  list: async () => (await client.api.soundboard.$get()).json(),
  upload: async (body: UploadSoundBody) =>
    (await client.api.soundboard.$post({ json: body })).json(),
  update: async (id: string, body: UpdateSoundBody) =>
    (await client.api.soundboard[":id"].$patch({ param: { id }, json: body })).json(),
  remove: async (id: string) =>
    (await client.api.soundboard[":id"].$delete({ param: { id } })).json(),
};
