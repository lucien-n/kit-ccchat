import { m } from "$lib/paraglide/messages";
import type { MessageView } from "$lib/api";
import { jumpToPresent, openMessage } from "$lib/app";
import { appearance, channels, messages, search, typing } from "$lib/stores";
import { getContext, setContext, tick } from "svelte";
import { toast } from "svelte-sonner";

const KEY = Symbol("chat");

const FLASH_MS = 1400;

export type ChatPanel = "" | "search" | "members";

export class ChatContext {
  isDesktop = $state(false);
  showMembers = $state(false);
  stick = $state(true);
  fromBottom = $state(0);
  flashId = $state<string | null>(null);
  replyTo = $state<MessageView | null>(null);
  composer = $state<{ focus: () => void } | null>(null);
  scroller = $state<HTMLElement | null>(null);

  #flashTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(isDesktop: boolean, showMembers: boolean) {
    this.isDesktop = isDesktop;
    this.showMembers = showMembers;
  }

  get panel(): ChatPanel {
    if (search.open) return "search";
    return this.showMembers ? "members" : "";
  }

  set panel(next: ChatPanel) {
    if (next === "search") search.open = true;
    else search.close();
    this.showMembers = next === "members";
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
    el.scrollIntoView({
      block: "center",
      behavior: appearance.motionReduced ? "auto" : "smooth",
    });
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
    if (!this.scrollTo(messageId)) toast.info(m.chat_message_unavailable());
  }

  async jumpToHit(channelId: string, messageId: string) {
    this.stick = false;
    await openMessage(channelId, messageId);
    await tick();
    if (!this.scrollTo(messageId)) toast.info(m.chat_message_unavailable());
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

  typing() {
    const channelId = channels.currentId;
    if (channelId) typing.signal(channelId);
  }

  send(text: string, attachmentIds?: string[]): boolean {
    const channelId = channels.currentId;
    if (!channelId) return false;
    if (!messages.send(channelId, text, this.replyTo?.id, attachmentIds)) {
      toast.error(m.chat_not_connected());
      return false;
    }
    this.replyTo = null;
    typing.resetSignal();
    return true;
  }
}

export function setChatContext(isDesktop: boolean, showMembers: boolean): ChatContext {
  return setContext(KEY, new ChatContext(isDesktop, showMembers));
}

export function getChatContext(): ChatContext {
  return getContext<ChatContext>(KEY);
}
