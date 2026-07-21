import { searchQuery } from "@ccchat/shared";
import type { QueryContext } from "../../http/context.js";
import * as searchService from "./search.service.js";

export function search(c: QueryContext<typeof searchQuery>) {
  return c.json(searchService.search(c.req.valid("query")));
}
