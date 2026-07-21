import { SEARCH_PAGE, SearchSort } from "@ccchat/shared";
import { api, type SearchHit } from "../api";

export interface SearchFilters {
  q: string;
  channelId?: string;
  authorId?: string;
}

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

/** A filter on its own is a search: "everything Ana said in #dev" needs no text.
 *  Text on its own has to be long enough to be worth indexing against. */
export const searchable = (f: SearchFilters) =>
  f.q.trim().length >= MIN_QUERY || Boolean(f.channelId) || Boolean(f.authorId);

class Search {
  open = $state(false);
  raw = $state("");
  sort = $state<SearchSort>(SearchSort.Newest);
  hits = $state<SearchHit[]>([]);
  total = $state(0);
  hasMore = $state(false);
  loading = $state(false);
  ran = $state(false);
  #seq = 0;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #lastKey = "";
  #lastFilters: SearchFilters | null = null;

  schedule(filters: SearchFilters) {
    const key = `${this.sort}|${filters.q}|${filters.channelId ?? ""}|${filters.authorId ?? ""}`;
    if (key === this.#lastKey) return;
    this.#lastKey = key;
    this.#lastFilters = filters;

    clearTimeout(this.#timer);
    if (!searchable(filters)) {
      this.#seq++;
      this.hits = [];
      this.total = 0;
      this.hasMore = false;
      this.loading = false;
      this.ran = false;
      return;
    }
    this.loading = true;
    this.#timer = setTimeout(() => void this.#run(filters), DEBOUNCE_MS);
  }

  async #run(filters: SearchFilters) {
    const seq = ++this.#seq;
    this.loading = true;
    try {
      const res = await api.search.messages({
        ...filters,
        sort: this.sort,
        limit: SEARCH_PAGE,
      });
      if (seq !== this.#seq) return;
      this.hits = res.hits;
      this.total = res.total;
      this.hasMore = res.hasMore;
      this.ran = true;
    } finally {
      if (seq === this.#seq) this.loading = false;
    }
  }

  async more() {
    const filters = this.#lastFilters;
    if (!filters || this.loading || !this.hasMore) return;
    const seq = this.#seq;
    this.loading = true;
    try {
      const res = await api.search.messages({
        ...filters,
        sort: this.sort,
        limit: SEARCH_PAGE,
        offset: this.hits.length,
      });
      if (seq !== this.#seq) return;
      this.hits = [...this.hits, ...res.hits];
      this.total = res.total;
      this.hasMore = res.hasMore;
    } finally {
      if (seq === this.#seq) this.loading = false;
    }
  }

  reset() {
    clearTimeout(this.#timer);
    this.#seq++;
    this.raw = "";
    this.hits = [];
    this.total = 0;
    this.hasMore = false;
    this.loading = false;
    this.ran = false;
    this.#lastKey = "";
    this.#lastFilters = null;
  }

  close() {
    this.open = false;
    this.reset();
  }
}

export const search = new Search();
