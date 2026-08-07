import { api, type MessageView } from "$lib/api";

/** The pinned messages of whichever channel the pins popover last opened on.
 *  Kept in a store, not the popover, so a live pin/unpin event can refresh it
 *  without the popover having to be mounted. */
class Pins {
  list = $state<MessageView[]>([]);
  loading = $state(false);
  #channelId: string | null = null;

  async load(channelId: string) {
    this.#channelId = channelId;
    this.loading = true;
    try {
      const { pins } = await api.messages.pins(channelId);
      if (this.#channelId === channelId) this.list = pins;
    } finally {
      if (this.#channelId === channelId) this.loading = false;
    }
  }

  /** A pin toggled somewhere. Refresh only if it hit the channel we're showing;
   *  any other channel reloads from scratch the next time its popover opens. */
  invalidate(channelId: string) {
    if (this.#channelId === channelId) void this.load(channelId);
  }

  clear() {
    this.list = [];
    this.loading = false;
    this.#channelId = null;
  }
}

export const pins = new Pins();
