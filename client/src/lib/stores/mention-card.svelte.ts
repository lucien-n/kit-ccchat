/** The user card opened by clicking a mention. One card for the whole app: a
 *  channel renders dozens of messages, and standing up a popover per mention to
 *  show one at a time would be waste. The card anchors itself to whichever
 *  element was clicked, which is how it attaches to markdown output that Svelte
 *  never rendered. */
class MentionCard {
  userId = $state<string | null>(null);
  anchor = $state<HTMLElement | null>(null);
  open = $state(false);

  show(userId: string, anchor: HTMLElement) {
    this.userId = userId;
    this.anchor = anchor;
    this.open = true;
  }

  clear() {
    this.open = false;
    this.userId = null;
    this.anchor = null;
  }
}

export const mentionCard = new MentionCard();
