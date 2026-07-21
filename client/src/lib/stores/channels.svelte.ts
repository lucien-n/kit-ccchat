import { api, type Channel } from "../api";

class Channels {
  list = $state<Channel[]>([]);
  currentId = $state<string | null>(null);

  get current(): Channel | null {
    return this.list.find((c) => c.id === this.currentId) ?? null;
  }

  async load() {
    this.list = (await api.channels.list()).channels;
  }

  clear() {
    this.list = [];
    this.currentId = null;
  }
}

export const channels = new Channels();
