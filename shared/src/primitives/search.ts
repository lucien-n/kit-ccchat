import { z } from "zod";

export enum SearchSort {
  Newest = "newest",
  Relevance = "relevance",
}
export const searchSort = z.enum(SearchSort);

export const SEARCH_PAGE = 25;

/** Bracket every matched run inside a search snippet. Control characters, so
 *  they survive JSON, never collide with anything someone can type, and carry no
 *  meaning to a renderer that forgets to split on them. */
export const MATCH_OPEN = String.fromCharCode(1);
export const MATCH_CLOSE = String.fromCharCode(2);
