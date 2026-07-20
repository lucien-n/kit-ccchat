<script lang="ts">
  import { type MessageView } from "$lib/api";
  import UserAvatar from "$lib/components/common/UserAvatar.svelte";
  import { UserCard } from "$lib/components/common/UserCard";
  import Markdown from "$lib/components/markdown/Markdown.svelte";
  import { Button } from "$lib/components/ui/button";
  import { Textarea } from "$lib/components/ui/textarea";
  import { apiErrorMessage } from "$lib/forms";
  import { messages } from "$lib/stores/messages.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { cn } from "$lib/utils";
  import { MESSAGE_MAX_LENGTH, SystemEvent } from "@ccchat/shared";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import ReplyIcon from "@lucide/svelte/icons/reply";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import UserRoundPlusIcon from "@lucide/svelte/icons/user-round-plus";
  import { tick } from "svelte";
  import { toast } from "svelte-sonner";

  interface Props {
    message: MessageView;
    flashId: string | null;
    onJumpTo: (messageId: string) => void;
    onStartReply: () => void;
  }
  const { message, flashId, onJumpTo, onStartReply }: Props = $props();

  const isMine = $derived(message.author?.id === session.user?.id);
  const canDelete = $derived(session.isAdmin || isMine);
  const canEdit = $derived(!message.systemEvent && isMine);
  const subject = $derived(message.author?.displayName ?? "someone");

  let editing = $state(false);
  let draft = $state("");
  let editEl = $state<HTMLTextAreaElement | null>(null);

  async function startEdit() {
    draft = message.content;
    editing = true;
    await tick();
    editEl?.focus();
  }

  async function saveEdit() {
    const text = draft.trim();
    if (!text || text === message.content) {
      editing = false;
      return;
    }
    try {
      await messages.edit(message.id, text);
      editing = false;
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to edit message"));
    }
  }

  function onEditKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      editing = false;
    } else if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      void saveEdit();
    }
  }

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
        <UserAvatar user={message.author} class="size-9" fallbackClass="text-sm" />
      </UserCard>
    {:else}
      <UserAvatar
        user={null}
        class={cn("size-9", message.replyTo ? "mt-4.5" : "mt-0.5")}
        fallbackClass="text-sm"
      />
    {/if}
    <div class="min-w-0">
      {#if message.replyTo}
        {@const reply = message.replyTo}
        {#if reply.deleted}
          <div class="text-muted-foreground flex items-center gap-1.5 text-xs italic">
            <ReplyIcon class="size-3 shrink-0" />
            Original message was deleted
          </div>
        {:else}
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground flex w-full min-w-0 items-center gap-1.5 text-left text-xs"
            onclick={() => onJumpTo(reply.id)}
          >
            <ReplyIcon class="size-3 shrink-0" />
            <UserAvatar
              user={reply.author}
              class="size-4 shrink-0"
              fallbackClass="text-[0.5rem]"
            />
            <span class="shrink-0 font-medium">
              {reply.author?.displayName ?? "unknown"}
            </span>
            <span class="text-foreground truncate">{reply.content}</span>
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
        {#if message.editedAt}
          <span class="text-muted-foreground text-[10px]">(edited)</span>
        {/if}
      </div>
      {#if editing}
        <div class="mt-1">
          <Textarea
            bind:ref={editEl}
            bind:value={draft}
            rows={1}
            maxlength={MESSAGE_MAX_LENGTH}
            class="thin-scrollbar field-sizing-content max-h-60 min-h-8"
            onkeydown={onEditKeydown}
          />
          <div class="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
            <button type="button" class="hover:text-foreground" onclick={saveEdit}>
              save
            </button>
            <button
              type="button"
              class="hover:text-foreground"
              onclick={() => (editing = false)}
            >
              cancel
            </button>
            <span class="opacity-70">escape to cancel &middot; enter to save</span>
          </div>
        </div>
      {:else}
        <Markdown content={message.content} />
      {/if}
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
      {#if canEdit}
        <Button
          variant="ghost"
          size="icon"
          class="size-7"
          title="Edit"
          onclick={startEdit}
        >
          <PencilIcon class="size-4" />
        </Button>
      {/if}
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
