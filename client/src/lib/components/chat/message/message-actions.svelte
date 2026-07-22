<script lang="ts">
  import { type MessageView } from "$lib/api";
  import { getChatContext } from "$lib/context/chat.svelte";
  import { apiErrorMessage } from "$lib/forms";
  import { toggleReaction } from "$lib/reactions";
  import { messages } from "$lib/stores/messages.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { Button } from "&/button";
  import { Separator } from "&/separator";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import ReplyIcon from "@lucide/svelte/icons/reply";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import { toast } from "svelte-sonner";
  import EmojiPicker from "../emoji-picker.svelte";

  interface Props {
    message: MessageView;
    onedit: () => void;
  }
  const { message, onedit }: Props = $props();

  const chat = getChatContext();

  const isMine = $derived(message.author?.id === session.user?.id);
  const canDelete = $derived(session.isAdmin || isMine);
  const canEdit = $derived(!message.systemEvent && isMine);

  async function remove() {
    try {
      await messages.delete(message.id);
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to delete message"));
    }
  }
</script>

<div class="bg-popover flex items-center gap-1 rounded-2xl border p-0.5">
  {#each ["👍", "😂", "❤️"] as emoji (emoji)}
    <Button
      variant="ghost"
      size="icon-sm"
      title="React with {emoji}"
      onclick={() => toggleReaction(message, emoji)}
      class="text-base"
    >
      {emoji}
    </Button>
  {/each}

  <div class="h-full py-1">
    <Separator orientation="vertical" />
  </div>

  <EmojiPicker onpick={(emoji) => toggleReaction(message, emoji)} class="size-7" />

  <Button
    variant="ghost"
    size="icon"
    class="size-7"
    title="Reply"
    onclick={() => chat.startReply(message)}
  >
    <ReplyIcon class="size-4" />
  </Button>

  {#if canEdit}
    <Button variant="ghost" size="icon" class="size-7" title="Edit" onclick={onedit}>
      <PencilIcon class="size-4" />
    </Button>
  {/if}

  {#if canDelete}
    <Button variant="ghost" size="icon" class="size-7" title="Delete" onclick={remove}>
      <Trash2Icon class="size-4" />
    </Button>
  {/if}
</div>
