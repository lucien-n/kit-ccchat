import type { MessageView } from "$lib/api";
import { apiErrorMessage } from "$lib/forms";
import { messages } from "$lib/stores/messages.svelte";
import { session } from "$lib/stores/session.svelte";
import { toast } from "svelte-sonner";

export const reactedByMe = (userIds: string[]) =>
  !!session.user && userIds.includes(session.user.id);

/** Clicking an emoji you already picked takes it back, wherever you click it:
 *  the pill under the message and the quick buttons in the hover bar are two
 *  ways to press the same switch. */
export async function toggleReaction(message: MessageView, emoji: string) {
  const mine = message.reactions.some((r) => r.emoji === emoji && reactedByMe(r.userIds));
  try {
    if (mine) await messages.unreact(message.id, emoji);
    else await messages.react(message.id, emoji);
  } catch (e) {
    toast.error(apiErrorMessage(e, "failed to react"));
  }
}
