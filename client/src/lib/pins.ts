import { m } from "$lib/paraglide/messages";
import type { MessageView } from "$lib/api";
import { apiErrorMessage } from "$lib/forms";
import { messages, session } from "$lib/stores";
import { toast } from "svelte-sonner";

export const canPin = (message: MessageView): boolean =>
  !message.systemEvent && (!!session.isAdmin || message.author?.id === session.user?.id);

export async function togglePin(message: MessageView) {
  try {
    if (message.pinned) await messages.unpin(message.id);
    else await messages.pin(message.id);
  } catch (e) {
    toast.error(apiErrorMessage(e, m.pins_pin_failed()));
  }
}
