<script lang="ts">
  import { type MessageView } from "$lib/api";
  import { getChatContext } from "$lib/context/chat.svelte";
  import { attempt } from "$lib/forms";
  import { canPin, togglePin } from "$lib/pins";
  import { toggleReaction } from "$lib/reactions";
  import { messages, session } from "$lib/stores";
  import { Button } from "&/button";
  import { Separator } from "&/separator";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import PinIcon from "@lucide/svelte/icons/pin";
  import PinOffIcon from "@lucide/svelte/icons/pin-off";
  import ReplyIcon from "@lucide/svelte/icons/reply";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import EmojiPicker from "../emoji-picker.svelte";

  interface Props {
    message: MessageView;
    onedit: () => void;
    menuOpen?: boolean;
  }
  let { message, onedit, menuOpen = $bindable(false) }: Props = $props();

  const chat = getChatContext();

  const isMine = $derived(message.author?.id === session.user?.id);
  const canDelete = $derived(session.isAdmin || isMine);
  const canEdit = $derived(!message.systemEvent && isMine);

  async function remove() {
    await attempt(() => messages.delete(message.id), {
      error: "failed to delete message",
    });
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

  <EmojiPicker
    bind:open={menuOpen}
    onpick={(emoji) => toggleReaction(message, emoji)}
    class="size-7"
  />

  <Button
    variant="ghost"
    size="icon"
    class="size-7"
    title="Reply"
    onclick={() => chat.startReply(message)}
  >
    <ReplyIcon class="size-4" />
  </Button>

  {#if canPin(message)}
    <Button
      variant="ghost"
      size="icon"
      class="size-7"
      title={message.pinned ? "Unpin" : "Pin"}
      onclick={() => togglePin(message)}
    >
      {#if message.pinned}
        <PinOffIcon class="size-4" />
      {:else}
        <PinIcon class="size-4" />
      {/if}
    </Button>
  {/if}

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
