import { ClientEventType } from "@ccchat/shared";
import { api, type MessageView } from "../api";
import { realtime } from "./realtime.svelte";
import { session } from "./session.svelte";

const PAGE = 20;

class Messages {
  list = $state<MessageView[]>([]);
  hasMore = $state(false);
  loading = $state(false);
  loadingOlder = $state(false);
  #channelId: string | null = null;
  #arrivedDuringLoad: MessageView[] | null = null;

  async #pageIfStillCurrent(before?: number): Promise<MessageView[] | null> {
    const token = session.token;
    const channelId = this.#channelId;
    if (!token || !channelId) return null;

    const { messages } = await api.history(token, channelId, before, PAGE);
    if (this.#channelId !== channelId) return null;
    this.hasMore = messages.length >= PAGE;
    return messages;
  }

  async load(channelId: string) {
    const switchingChannel = this.#channelId !== channelId;
    this.#channelId = channelId;
    this.loadingOlder = false;
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
      }
    } finally {
      this.#arrivedDuringLoad = null;
      if (this.#channelId === channelId) this.loading = false;
    }
  }

  async loadOlder() {
    if (this.loading || this.loadingOlder || !this.hasMore) return;
    const oldest = this.list[0]?.createdAt;
    if (!oldest) return;

    this.loadingOlder = true;
    try {
      const page = await this.#pageIfStillCurrent(oldest);
      if (page?.length) this.list = [...page, ...this.list];
    } finally {
      this.loadingOlder = false;
    }
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
    if (!session.token) return;
    await api.editMessage(session.token, id, content);
  }

  async delete(id: string) {
    if (!session.token) return;
    await api.deleteMessage(session.token, id);
  }

  append(message: MessageView) {
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

  clear() {
    this.list = [];
    this.hasMore = false;
    this.loading = false;
    this.loadingOlder = false;
    this.#channelId = null;
    this.#arrivedDuringLoad = null;
  }
}

export const messages = new Messages();
