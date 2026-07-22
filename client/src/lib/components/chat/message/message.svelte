<script lang="ts">
  import { type MessageView } from "$lib/api";
  import UserAvatar from "$lib/components/common/user-avatar.svelte";
  import { UserCard } from "$lib/components/common/user-card";
  import Markdown from "$lib/components/markdown/markdown.svelte";
  import { getChatContext } from "$lib/context/chat.svelte";
  import { apiErrorMessage } from "$lib/forms";
  import { pingsMe } from "$lib/mentions";
  import { messages } from "$lib/stores/messages.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { cn } from "$lib/utils";
  import { Textarea } from "&/textarea";
  import { MESSAGE_MAX_LENGTH, SystemEvent } from "@ccchat/shared";
  import ReplyIcon from "@lucide/svelte/icons/reply";
  import UserRoundPlusIcon from "@lucide/svelte/icons/user-round-plus";
  import { tick } from "svelte";
  import { toast } from "svelte-sonner";
  import MessageActions from "./message-actions.svelte";
  import MessageReactions from "./message-reactions.svelte";

  interface Props {
    message: MessageView;
  }
  const { message }: Props = $props();

  const chat = getChatContext();

  const isMine = $derived(message.author?.id === session.user?.id);
  const mentionsMe = $derived(!message.systemEvent && !isMine && pingsMe(message));

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
  <div id="msg-{message.id}" class="text-muted-foreground flex gap-1.5 py-1 text-xs">
    {#if message.systemEvent === SystemEvent.Member_Join}
      <UserRoundPlusIcon class="size-3.5 shrink-0" />
      <span><span class="text-foreground font-medium">{subject}</span> joined</span>
    {/if}
    <span class="opacity-70">{fmtTime(message.createdAt)}</span>
  </div>
{:else}
  <div
    id="msg-{message.id}"
    class={cn(
      "group hover:bg-muted/30 relative flex gap-3 rounded-2xl px-2 py-1 transition-colors duration-700",
      mentionsMe &&
        "bg-primary/8 hover:bg-primary/12 border-primary/70 rounded-l-none border-l-2",
      chat.flashId === message.id && "bg-primary/15",
    )}
  >
    {#if message.author}
      <UserCard userId={message.author.id}>
        <UserAvatar user={message.author} class="size-9" fallbackClass="text-sm" />
      </UserCard>
    {:else}
      <UserAvatar user={null} fallbackClass="text-sm" />
    {/if}
    <div class="flex w-full min-w-0 flex-col">
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
              onclick={() => chat.jumpTo(reply.id)}
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

      <MessageReactions {message} />
    </div>
    <div
      class="absolute -top-3.5 right-2 flex opacity-100 transition-opacity duration-50 ease-in-out sm:opacity-0 sm:group-hover:opacity-100"
    >
      <MessageActions {message} onedit={startEdit} />
    </div>
  </div>
{/if}
