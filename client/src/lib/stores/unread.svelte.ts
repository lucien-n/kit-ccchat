import { api } from "../api";

class Unread {
  counts = $state<Record<string, number>>({});
  mentions = $state<Record<string, number>>({});

  private timer: ReturnType<typeof setTimeout> | null = null;

  get total(): number {
    return Object.values(this.counts).reduce((a, b) => a + b, 0);
  }

  async load() {
    try {
      const { unreads, mentions } = await api.channels.unreads();
      this.counts = unreads ?? {};
      this.mentions = mentions ?? {};
    } catch {
      /* leave badges empty if it fails */
    }
  }

  bump(channelId: string, mentioned = false) {
    this.counts[channelId] = (this.counts[channelId] ?? 0) + 1;
    if (mentioned) this.mentions[channelId] = (this.mentions[channelId] ?? 0) + 1;
  }

  async markRead(channelId: string) {
    this.counts[channelId] = 0;
    this.mentions[channelId] = 0;
    await api.channels.markRead(channelId).catch(() => {});
  }

  scheduleMarkRead(channelId: string) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.markRead(channelId), 1200);
  }

  clear() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.counts = {};
    this.mentions = {};
  }
}

export const unread = new Unread();
