<script lang="ts">
  import { avatarUrl, type MessageView } from "$lib/api";
  import { messages } from "$lib/stores/messages.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { cn } from "$lib/utils";
  import { SystemEvent } from "@ccchat/shared";
  import ReplyIcon from "@lucide/svelte/icons/reply";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import UserRoundPlusIcon from "@lucide/svelte/icons/user-round-plus";
  import Markdown from "$lib/components/markdown/Markdown.svelte";
  import UserAvatar from "$lib/components/common/UserAvatar.svelte";
  import UserCard from "$lib/components/common/UserCard.svelte";
  import { Button } from "$lib/components/ui/button";

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
  const subject = $derived(message.author?.displayName ?? "someone");

  function fmtTime(ts: number) {
    return new Date(ts).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

{#if message.systemEvent}
  <div
    id="msg-{message.id}"
    class="text-muted-foreground flex items-center justify-center gap-1.5 py-1 text-xs"
  >
    {#if message.systemEvent === SystemEvent.Member_Join}
      <UserRoundPlusIcon class="size-3.5 shrink-0" />
      <span><span class="text-foreground font-medium">{subject}</span> joined</span>
    {/if}
    <span class="opacity-70">{fmtTime(message.createdAt)}</span>
  </div>
{:else}
  <div
    id="msg-{message.id}"
    class="group hover:bg-muted/40 relative flex gap-3 rounded-md px-2 py-1 transition-colors duration-700 {flashId ===
    message.id
      ? 'bg-primary/15'
      : ''}"
  >
    {#if message.author}
      <UserCard
        userId={message.author.id}
        class={cn("shrink-0", message.replyTo ? "mt-4.5" : "mt-0.5")}
      >
        <UserAvatar
          src={avatar}
          name={message.author.displayName}
          class="size-9"
          fallbackClass="text-sm"
        />
      </UserCard>
    {:else}
      <UserAvatar
        src={avatar}
        name={undefined}
        class={cn("size-9", message.replyTo ? "mt-4.5" : "mt-0.5")}
        fallbackClass="text-sm"
      />
    {/if}
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
            <UserAvatar
              src={rav}
              name={r.author?.displayName}
              class="size-4 shrink-0"
              fallbackClass="text-[0.5rem]"
            />
            <span class="shrink-0 font-medium">
              {r.author?.displayName ?? "unknown"}
            </span>
            <span class="text-foreground truncate">{r.content}</span>
          </button>
        {/if}
      {/if}
      <div class="flex items-baseline gap-2">
        {#if message.author}
          <UserCard userId={message.author.id}>
            <span
              class="font-semibold hover:underline"
              style={message.author.color ? `color:${message.author.color}` : undefined}
            >
              {message.author.displayName}
            </span>
          </UserCard>
        {:else}
          <span class="font-semibold">unknown</span>
        {/if}
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
{/if}
