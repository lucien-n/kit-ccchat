import type { AttachmentSearchQuery, SearchQuery } from "@motus/shared";
import { client } from "./http";

export const search = {
  messages: async (query: Partial<SearchQuery> & Pick<SearchQuery, "q">) =>
    (await client.api.search.$get({ query })).json(),
  attachments: async (query: Partial<AttachmentSearchQuery> & Pick<AttachmentSearchQuery, "q">) =>
    (await client.api.search.attachments.$get({ query })).json(),
};
