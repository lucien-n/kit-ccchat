import { ClientEventType } from "@ccchat/shared";
import { api, type MessageView } from "../api";
import { realtime } from "./realtime.svelte";
import { session } from "./session.svelte";

/** Only ever the open channel's messages. Switching channels replaces the list
 *  rather than caching per channel: history is one request away, and a cache
 *  would need invalidating on every delete broadcast. */
class Messages {
  list = $state<MessageView[]>([]);

  async load(channelId: string) {
    if (!session.token) return;
    this.list = (await api.history(session.token, channelId)).messages;
  }

  append(message: MessageView) {
    this.list = [...this.list, message];
  }

  /** Ids are unique across channels, so a delete for a channel we aren't
   *  reading simply matches nothing.
   *
   *  Replies quoting the deleted message are tombstoned in place. The server
   *  resolves a quote on read, so a reload would show this anyway; without it
   *  the deleted text stays on screen, quoted, until someone refreshes. */
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

  /** Deleting goes over REST for the permission check; the server broadcasts the
   *  removal, so the list updates through the same path as everyone else's. */
  async delete(id: string) {
    if (!session.token) return;
    await api.deleteMessage(session.token, id);
  }
}

export const messages = new Messages();
