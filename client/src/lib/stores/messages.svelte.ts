import { ClientEventType } from "@ccchat/shared";
import { api, type MessageView } from "../api";
import { realtime } from "./realtime.svelte";
import { session } from "./session.svelte";

const PAGE = 50;

/** Only ever the open channel's messages; switching channels refetches rather
 *  than caching, so there's no per-channel cache to invalidate on every delete. */
class Messages {
  list = $state<MessageView[]>([]);
  /** Whether an older page might still exist, so the view knows to keep paging. */
  hasMore = $state(false);
  loadingOlder = $state(false);
  #channelId: string | null = null;

  async load(channelId: string) {
    if (!session.token) return;
    this.#channelId = channelId;
    this.loadingOlder = false;
    const { messages } = await api.history(session.token, channelId, undefined, PAGE);
    this.list = messages;
    this.hasMore = messages.length >= PAGE;
  }

  /** Fetch the page just before the oldest message on screen and prepend it. */
  async loadOlder() {
    if (!session.token || this.loadingOlder || !this.hasMore || this.list.length === 0)
      return;
    const channelId = this.#channelId!;
    const before = this.list[0].createdAt;
    this.loadingOlder = true;
    try {
      const { messages } = await api.history(session.token, channelId, before, PAGE);
      // A channel switch mid-flight would land this page in the wrong list.
      if (this.#channelId !== channelId) return;
      this.hasMore = messages.length >= PAGE;
      if (messages.length) this.list = [...messages, ...this.list];
    } finally {
      this.loadingOlder = false;
    }
  }

  append(message: MessageView) {
    this.list = [...this.list, message];
  }

  /** Swap in the server's post-edit view; the broadcast reaches the author too,
   *  so an edit lands the same way for everyone. */
  applyEdit(message: MessageView) {
    const i = this.list.findIndex((m) => m.id === message.id);
    if (i === -1) return;
    const next = [...this.list];
    next[i] = message;
    this.list = next;
  }

  /** Over REST for the author check; the resulting broadcast updates our list
   *  through applyEdit, the same path as everyone else's. */
  async edit(id: string, content: string) {
    if (!session.token) return;
    await api.editMessage(session.token, id, content);
  }

  /** Author colors come from roles, so a role change restyles names already on
   *  screen. The color map is owned by the members store; passing it in keeps
   *  this store from reaching across to a sibling. */
  applyColors(colorById: Map<string, string | null>) {
    for (const m of this.list) {
      if (m.author && colorById.has(m.author.id))
        m.author.color = colorById.get(m.author.id) ?? null;
      if (m.replyTo?.author && colorById.has(m.replyTo.author.id))
        m.replyTo.author.color = colorById.get(m.replyTo.author.id) ?? null;
    }
  }

  /** Tombstones any reply quoting the deleted message in place. The server
   *  resolves quotes on read, so a reload would show this anyway; without it the
   *  deleted text stays quoted on screen until someone refreshes. */
  remove(id: string) {
    let changed = false;
    const next: MessageView[] = [];
    for (const m of this.list) {
      if (m.id === id) {
        changed = true;
      } else if (m.replyTo?.id === id && !m.replyTo.deleted) {
        next.push({ ...m, replyTo: { id, content: "", author: null, deleted: true } });
        changed = true;
      } else {
        next.push(m);
      }
    }
    if (changed) this.list = next;
  }

  clear() {
    this.list = [];
    this.hasMore = false;
    this.loadingOlder = false;
    this.#channelId = null;
  }

  send(channelId: string, content: string, replyToId?: string): boolean {
    return realtime.send({
      type: ClientEventType.Message_Create,
      channelId,
      content,
      replyToId,
    });
  }

  /** Over REST for the permission check; the server then broadcasts the removal,
   *  so our list updates through the same path as everyone else's. */
  async delete(id: string) {
    if (!session.token) return;
    await api.deleteMessage(session.token, id);
  }
}

export const messages = new Messages();
