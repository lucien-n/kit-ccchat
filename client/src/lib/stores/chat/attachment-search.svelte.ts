import { api, type AttachmentHit } from "$lib/api";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;
const PAGE = 20;

/** Filename search over message attachments. Same debounce-and-sequence shape as
 *  the message [[search]] store, but query-only: there are no channel/author
 *  filters, so a query below MIN_QUERY is simply empty. */
class AttachmentSearch {
  hits = $state<AttachmentHit[]>([]);
  loading = $state(false);
  #seq = 0;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #lastQuery = "";

  schedule(query: string) {
    const q = query.trim();
    if (q === this.#lastQuery) return;
    this.#lastQuery = q;

    clearTimeout(this.#timer);
    if (q.length < MIN_QUERY) {
      this.#seq++;
      this.hits = [];
      this.loading = false;
      return;
    }
    this.loading = true;
    this.#timer = setTimeout(() => void this.#run(q), DEBOUNCE_MS);
  }

  async #run(q: string) {
    const seq = ++this.#seq;
    this.loading = true;
    try {
      const res = await api.search.attachments({ q, limit: PAGE });
      if (seq !== this.#seq) return;
      this.hits = res.hits;
    } finally {
      if (seq === this.#seq) this.loading = false;
    }
  }

  reset() {
    clearTimeout(this.#timer);
    this.#seq++;
    this.hits = [];
    this.loading = false;
    this.#lastQuery = "";
  }
}

export const attachmentSearch = new AttachmentSearch();
