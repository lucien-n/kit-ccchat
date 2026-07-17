<script lang="ts">
  import { avatarUrl, type MessageView } from "$lib/api";
  import { messages } from "$lib/stores/messages.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { getInitials } from "$lib/utils";
  import ReplyIcon from "@lucide/svelte/icons/reply";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import Markdown from "./markdown/Markdown.svelte";
  import * as Avatar from "./ui/avatar";
  import { Button } from "./ui/button";

  interface Props {
    message: MessageView;
    flashId: string | null;
    onJumpTo: (messageId: string) => void;
    onStartReply: () => void;
  }
  const { message, flashId, onJumpTo, onStartReply }: Props = $props();

  const avatar = $derived(
    message.author ? avatarUrl(message.author.id, message.author.avatarVersion) : null,
  );
  const canDelete = $derived(session.isAdmin || message.author?.id === session.user?.id);

  function fmtTime(ts: number) {
    return new Date(ts).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<div
  id="msg-{message.id}"
  class="group hover:bg-muted/40 relative flex gap-3 rounded-md px-2 py-1 transition-colors duration-700 {flashId ===
  message.id
    ? 'bg-primary/15'
    : ''}"
>
  <Avatar.Root class="mt-0.5 size-9">
    {#if avatar}
      <Avatar.Image src={avatar} alt="" />
    {/if}
    <Avatar.Fallback class="bg-primary text-primary-foreground text-sm">
      {getInitials(message.author?.displayName)}
    </Avatar.Fallback>
  </Avatar.Root>
  <div class="min-w-0">
    {#if message.replyTo}
      {@const r = message.replyTo}
      {@const rav = r.author ? avatarUrl(r.author.id, r.author.avatarVersion) : null}
      {#if r.deleted}
        <div class="text-muted-foreground flex items-center gap-1.5 text-xs italic">
          <ReplyIcon class="size-3 shrink-0" />
          Original message was deleted
        </div>
      {:else}
        <button
          type="button"
          class="text-muted-foreground hover:text-foreground flex w-full min-w-0 items-center gap-1.5 text-left text-xs"
          onclick={() => onJumpTo(r.id)}
        >
          <ReplyIcon class="size-3 shrink-0" />
          <Avatar.Root class="size-4 shrink-0">
            {#if rav}<Avatar.Image src={rav} alt="" />{/if}
            <Avatar.Fallback class="bg-primary text-primary-foreground text-[0.5rem]">
              {getInitials(r.author?.displayName)}
            </Avatar.Fallback>
          </Avatar.Root>
          <span class="shrink-0 font-medium">
            {r.author?.displayName ?? "unknown"}
          </span>
          <span class="text-foreground truncate">{r.content}</span>
        </button>
      {/if}
    {/if}
    <div class="flex items-baseline gap-2">
      <span class="font-semibold">{message.author?.displayName ?? "unknown"}</span>
      <span class="text-muted-foreground text-xs">{fmtTime(message.createdAt)}</span>
    </div>
    <Markdown content={message.content} />
  </div>
  <div
    class="absolute top-1 right-2 flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
  >
    <Button
      variant="ghost"
      size="icon"
      class="size-7"
      title="Reply"
      onclick={onStartReply}
    >
      <ReplyIcon class="size-4" />
    </Button>
    {#if canDelete}
      <Button
        variant="ghost"
        size="icon"
        class="size-7"
        title="Delete"
        onclick={() => messages.delete(message.id)}
      >
        <Trash2Icon class="size-4" />
      </Button>
    {/if}
  </div>
</div>
