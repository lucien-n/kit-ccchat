import type { SearchQuery } from "@ccchat/shared";
import { client } from "./http";

export const search = {
  messages: async (query: Partial<SearchQuery> & Pick<SearchQuery, "q">) =>
    (await client.api.search.$get({ query })).json(),
};
