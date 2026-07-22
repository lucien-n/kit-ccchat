import { ClientEventType, type Reaction } from "@ccchat/shared";
import { api, type MessageView } from "../api";
import { realtime } from "./realtime.svelte";

const PAGE = 20;

class Messages {
  list = $state<MessageView[]>([]);
  hasMoreBefore = $state(false);
  hasMoreAfter = $state(false);
  loading = $state(false);
  loadingOlder = $state(false);
  loadingNewer = $state(false);
  #channelId: string | null = null;
  #arrivedDuringLoad: MessageView[] | null = null;

  get detached() {
    return this.hasMoreAfter;
  }

  async #pageIfStillCurrent(
    opts: { before?: number; after?: number } = {},
  ): Promise<MessageView[] | null> {
    const channelId = this.#channelId;
    if (!channelId) return null;

    const { messages } = await api.messages.history(channelId, { ...opts, limit: PAGE });
    return this.#channelId === channelId ? messages : null;
  }

  async load(channelId: string) {
    const switchingChannel = this.#channelId !== channelId;
    this.#channelId = channelId;
    this.loadingOlder = false;
    this.loadingNewer = false;
    if (switchingChannel) {
      this.list = [];
      this.loading = true;
    }

    this.#arrivedDuringLoad = [];
    try {
      const page = await this.#pageIfStillCurrent();
      if (page) {
        const ids = new Set(page.map((m) => m.id));
        this.list = [...page, ...this.#arrivedDuringLoad.filter((m) => !ids.has(m.id))];
        this.hasMoreBefore = page.length >= PAGE;
        this.hasMoreAfter = false;
      }
    } finally {
      this.#arrivedDuringLoad = null;
      if (this.#channelId === channelId) {
        this.loading = false;
      }
    }
  }

  async loadAround(channelId: string, messageId: string): Promise<boolean> {
    const switchingChannel = this.#channelId !== channelId;
    this.#channelId = channelId;
    this.loadingOlder = false;
    this.loadingNewer = false;
    if (switchingChannel) this.list = [];
    this.loading = true;
    this.#arrivedDuringLoad = [];

    try {
      const window = await api.messages.around(channelId, messageId, PAGE);
      if (this.#channelId !== channelId) return false;

      const ids = new Set(window.messages.map((m) => m.id));
      const live = window.hasMoreAfter
        ? []
        : this.#arrivedDuringLoad.filter((m) => !ids.has(m.id));

      this.list = [...window.messages, ...live];
      this.hasMoreBefore = window.hasMoreBefore;
      this.hasMoreAfter = window.hasMoreAfter;
      return true;
    } catch {
      return false;
    } finally {
      this.#arrivedDuringLoad = null;
      if (this.#channelId === channelId) this.loading = false;
    }
  }

  async jumpToPresent() {
    if (this.#channelId) await this.load(this.#channelId);
  }

  async loadOlder() {
    if (this.loading || this.loadingOlder || !this.hasMoreBefore) return;
    const oldest = this.list[0]?.createdAt;
    if (!oldest) return;

    this.loadingOlder = true;
    try {
      const page = await this.#pageIfStillCurrent({ before: oldest });
      if (page) {
        this.hasMoreBefore = page.length >= PAGE;
        if (page.length) this.list = [...page, ...this.list];
      }
    } finally {
      this.loadingOlder = false;
    }
  }

  async loadNewer() {
    if (this.loading || this.loadingNewer || !this.hasMoreAfter) return;
    const newest = this.list.at(-1)?.createdAt;
    if (!newest) return;

    this.loadingNewer = true;
    try {
      const page = await this.#pageIfStillCurrent({ after: newest });
      if (page) {
        this.hasMoreAfter = page.length >= PAGE;
        if (page.length) this.list = [...this.list, ...page];
      }
    } finally {
      this.loadingNewer = false;
    }
  }

  append(message: MessageView) {
    if (this.hasMoreAfter) return;
    this.list = [...this.list, message];
    this.#arrivedDuringLoad?.push(message);
  }

  applyEdit(message: MessageView) {
    this.list = this.list.map((m) => (m.id === message.id ? message : m));
  }

  remove(id: string) {
    this.list = this.list
      .filter((m) => m.id !== id)
      .map((m) =>
        m.replyTo?.id === id && !m.replyTo.deleted
          ? { ...m, replyTo: { id, content: "", author: null, deleted: true } }
          : m,
      );
  }

  applyColors(colorById: Map<string, string | null>) {
    for (const m of this.list) {
      if (m.author && colorById.has(m.author.id))
        m.author.color = colorById.get(m.author.id) ?? null;
      if (m.replyTo?.author && colorById.has(m.replyTo.author.id))
        m.replyTo.author.color = colorById.get(m.replyTo.author.id) ?? null;
    }
  }

  applyReactions(id: string, reactions: Reaction[]) {
    this.list = this.list.map((m) => (m.id === id ? { ...m, reactions } : m));
  }

  send(channelId: string, content: string, replyToId?: string): boolean {
    return realtime.send({
      type: ClientEventType.Message_Create,
      channelId,
      content,
      replyToId,
    });
  }

  async edit(id: string, content: string) {
    await api.messages.edit(id, content);
  }

  async delete(id: string) {
    await api.messages.delete(id);
  }

  async react(id: string, emoji: string) {
    await api.messages.react(id, emoji);
  }

  async unreact(id: string, emoji: string) {
    await api.messages.unreact(id, emoji);
  }

  clear() {
    this.list = [];
    this.hasMoreBefore = false;
    this.hasMoreAfter = false;
    this.loading = false;
    this.loadingOlder = false;
    this.loadingNewer = false;
    this.#channelId = null;
    this.#arrivedDuringLoad = null;
  }
}

export const messages = new Messages();
