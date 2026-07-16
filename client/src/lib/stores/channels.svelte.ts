import { api, type Channel } from "../api";
import { session } from "./session.svelte";

class Channels {
  list = $state<Channel[]>([]);
  currentId = $state<string | null>(null);

  get current(): Channel | null {
    return this.list.find((c) => c.id === this.currentId) ?? null;
  }

  async load() {
    if (!session.token) return;
    this.list = (await api.channels(session.token)).channels;
  }

  clear() {
    this.list = [];
    this.currentId = null;
  }
}

export const channels = new Channels();
