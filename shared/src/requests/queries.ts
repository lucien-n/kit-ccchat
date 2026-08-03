import { z } from "zod";
import { SEARCH_PAGE, searchSort, SearchSort } from "../primitives.js";

const queryValue = z.union([z.string(), z.number()]).optional();

const positive = (v: string | number | undefined): number | undefined => {
  const n = Number(v);
  return v !== undefined && Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined;
};

export const messageHistoryQuery = z
  .object({ before: queryValue, after: queryValue, limit: queryValue })
  .transform((q) => ({
    before: positive(q.before),
    after: positive(q.after),
    limit: Math.min(positive(q.limit) ?? 50, 100),
  }));
export type MessageHistoryQuery = z.infer<typeof messageHistoryQuery>;

export const messageAroundQuery = z
  .object({ limit: queryValue })
  .transform((q) => ({ limit: Math.min(positive(q.limit) ?? 25, 100) }));

export const searchQuery = z
  .object({
    q: z.string().optional(),
    channelId: z.string().optional(),
    authorId: z.string().optional(),
    sort: searchSort.optional(),
    limit: queryValue,
    offset: queryValue,
  })
  .transform((s) => ({
    q: s.q ?? "",
    channelId: s.channelId || undefined,
    authorId: s.authorId || undefined,
    sort: s.sort ?? SearchSort.Newest,
    limit: Math.min(positive(s.limit) ?? SEARCH_PAGE, 50),
    offset: Math.max(Math.trunc(Number(s.offset)) || 0, 0),
  }));
export type SearchQuery = z.infer<typeof searchQuery>;
