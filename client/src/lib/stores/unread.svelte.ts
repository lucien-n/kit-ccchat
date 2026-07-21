import { api } from "../api";

class Unread {
  counts = $state<Record<string, number>>({});

  private timer: ReturnType<typeof setTimeout> | null = null;

  get total(): number {
    return Object.values(this.counts).reduce((a, b) => a + b, 0);
  }

  async load() {
    try {
      this.counts = (await api.channels.unreads()).unreads ?? {};
    } catch {
      /* leave badges empty if it fails */
    }
  }

  bump(channelId: string) {
    this.counts[channelId] = (this.counts[channelId] ?? 0) + 1;
  }

  async markRead(channelId: string) {
    this.counts[channelId] = 0;
    await api.channels.markRead(channelId).catch(() => {});
  }

  /** Used while actively reading a channel, so a burst of messages costs one
   *  write instead of one per message. */
  scheduleMarkRead(channelId: string) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.markRead(channelId), 1200);
  }

  clear() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.counts = {};
  }
}

export const unread = new Unread();
