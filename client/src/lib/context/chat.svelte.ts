import type { MessageView } from "$lib/api";
import { jumpToPresent, openMessage } from "$lib/app";
import { channels } from "$lib/stores/channels.svelte";
import { messages } from "$lib/stores/messages.svelte";
import { search } from "$lib/stores/search.svelte";
import { getContext, setContext, tick } from "svelte";
import { toast } from "svelte-sonner";

const KEY = Symbol("chat");

const FLASH_MS = 1400;

export class ChatContext {
  isDesktop = $state(false);
  showMembers = $state(false);
  stick = $state(true);
  flashId = $state<string | null>(null);
  replyTo = $state<MessageView | null>(null);
  composer = $state<{ focus: () => void } | null>(null);
  scroller = $state<HTMLElement | null>(null);

  #flashTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(isDesktop: boolean, showMembers: boolean) {
    this.isDesktop = isDesktop;
    this.showMembers = showMembers;
  }

  flash(id: string) {
    this.flashId = id;
    clearTimeout(this.#flashTimer);
    this.#flashTimer = setTimeout(() => (this.flashId = null), FLASH_MS);
  }

  toBottom() {
    const el = this.scroller;
    if (el) el.scrollTop = el.scrollHeight;
  }

  scrollTo(id: string): boolean {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return false;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    this.flash(id);
    return true;
  }

  async jumpTo(messageId: string) {
    if (this.scrollTo(messageId)) return;
    const channelId = channels.currentId;
    if (!channelId) return;
    this.stick = false;
    await openMessage(channelId, messageId);
    await tick();
    if (!this.scrollTo(messageId)) toast.info("That message is no longer available.");
  }

  async jumpToHit(channelId: string, messageId: string) {
    this.stick = false;
    await openMessage(channelId, messageId);
    await tick();
    if (!this.scrollTo(messageId)) toast.info("That message is no longer available.");
    if (!this.isDesktop) search.close();
  }

  async backToPresent() {
    this.stick = true;
    await jumpToPresent();
    await tick();
    this.toBottom();
  }

  startReply(message: MessageView) {
    this.replyTo = message;
    this.composer?.focus();
  }

  send(text: string): boolean {
    const channelId = channels.currentId;
    if (!channelId) return false;
    if (!messages.send(channelId, text, this.replyTo?.id)) {
      toast.error("Not connected, your message wasn't sent.");
      return false;
    }
    this.replyTo = null;
    return true;
  }

  toggleSearch() {
    search.open = !search.open;
    if (search.open && this.isDesktop) this.showMembers = false;
  }
}

export function setChatContext(isDesktop: boolean, showMembers: boolean): ChatContext {
  return setContext(KEY, new ChatContext(isDesktop, showMembers));
}

export function getChatContext(): ChatContext {
  return getContext<ChatContext>(KEY);
}
