import type { SearchResults, SearchSort } from "@ccchat/shared";
import { request } from "./http";

export const search = {
  messages: (query: {
    q: string;
    channelId?: string;
    authorId?: string;
    sort?: SearchSort;
    limit?: number;
    offset?: number;
  }) => request<SearchResults>("/api/search", { query }),
};
