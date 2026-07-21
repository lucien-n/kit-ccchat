import { SEARCH_PAGE, SearchSort } from "@ccchat/shared";
import type { AppContext } from "../../http/context.js";
import * as searchService from "./search.service.js";

export function search(c: AppContext) {
  const sort =
    c.req.query("sort") === SearchSort.Relevance
      ? SearchSort.Relevance
      : SearchSort.Newest;

  return c.json(
    searchService.search({
      q: c.req.query("q") ?? "",
      channelId: c.req.query("channelId") || undefined,
      authorId: c.req.query("authorId") || undefined,
      sort,
      limit: Math.min(Number(c.req.query("limit")) || SEARCH_PAGE, 50),
      offset: Math.max(Number(c.req.query("offset")) || 0, 0),
    }),
  );
}
