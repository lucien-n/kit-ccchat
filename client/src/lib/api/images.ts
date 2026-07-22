import type { UploadImageBody } from "@ccchat/shared";
import { apiBase, client } from "./http";

export function imageUrl(id: string): string {
  return `${apiBase()}/api/images/${id}`;
}

export const images = {
  upload: async (body: UploadImageBody) =>
    (await client.api.images.$post({ json: body })).json(),
};
