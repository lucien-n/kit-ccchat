import { api, type Channel } from "$lib/api";

class Channels {
  list = $state<Channel[]>([]);
  currentId = $state<string | null>(null);

  get current(): Channel | null {
    return this.list.find((c) => c.id === this.currentId) ?? null;
  }

  async load() {
    this.list = (await api.channels.list()).channels;
  }

  /** Persist a new sidebar order (all channel ids, top-to-bottom) and refresh. */
  async reorder(orderedIds: string[]) {
    await api.channels.reorder(orderedIds);
    await this.load();
  }

  clear() {
    this.list = [];
    this.currentId = null;
  }
}

export const channels = new Channels();
