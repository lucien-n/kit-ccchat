import { ClientEventType } from "@ccchat/shared";
import { api, type MessageView } from "../api";
import { realtime } from "./realtime.svelte";
import { session } from "./session.svelte";

/** Only ever the open channel's messages; switching channels refetches rather
 *  than caching, so there's no per-channel cache to invalidate on every delete. */
class Messages {
  list = $state<MessageView[]>([]);

  async load(channelId: string) {
    if (!session.token) return;
    this.list = (await api.history(session.token, channelId)).messages;
  }

  append(message: MessageView) {
    this.list = [...this.list, message];
  }

  async refreshAuthorColors() {
    if (!session.token || this.list.length === 0) return;
    const { members } = await api.roster(session.token);
    const colorById = new Map(members.map((m) => [m.id, m.color]));
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
