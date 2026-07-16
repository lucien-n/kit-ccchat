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
   *  reading simply matches nothing. */
  remove(id: string) {
    const next = this.list.filter((m) => m.id !== id);
    if (next.length !== this.list.length) this.list = next;
  }

  clear() {
    this.list = [];
  }

  send(channelId: string, content: string): boolean {
    return realtime.send({ type: "message.create", channelId, content });
  }

  /** Deleting goes over REST for the permission check; the server broadcasts the
   *  removal, so the list updates through the same path as everyone else's. */
  async delete(id: string) {
    if (!session.token) return;
    await api.deleteMessage(session.token, id);
  }
}

export const messages = new Messages();
