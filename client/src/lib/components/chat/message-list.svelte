<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import { getChatContext } from "$lib/context/chat.svelte";
  import { messages, voice } from "$lib/stores";
  import { Button } from "&/button";
  import { ScrollArea } from "&/scroll-area";
  import { tick } from "svelte";
  import { Message } from "./message";
  import MessageSkeleton from "./message-skeleton.svelte";

  const chat = getChatContext();

  // voice.share.watching: closing a stream remounts the scroller at the top.
  $effect(() => {
    void messages.list.length;
    void voice.share.watching;
    if (chat.stick) chat.toBottom();
  });

  const onScroll = () => {
    const el = chat.scroller;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    chat.fromBottom = fromBottom;
    chat.stick = !messages.hasMoreAfter && fromBottom < 80;
    if (el.scrollTop < 150) void loadOlder();
    if (fromBottom < 150) void messages.loadNewer();
  };

  $effect(() => {
    const el = chat.scroller;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  });

  async function loadOlder() {
    const el = chat.scroller;
    if (!el || messages.loadingOlder || !messages.hasMoreBefore) return;
    const fromBottom = el.scrollHeight - el.scrollTop;
    const holdReadersSpot = () => {
      el.scrollTop = el.scrollHeight - fromBottom;
    };
    const page = messages.loadOlder();
    await tick();
    holdReadersSpot();
    await page;
    await tick();
    holdReadersSpot();
  }
</script>

<ScrollArea class="min-h-0 flex-1" bind:viewportRef={chat.scroller}>
  <div class="flex flex-col gap-0.5 p-3 sm:p-5">
    {#if messages.loading}
      <MessageSkeleton count={6} />
    {:else if messages.list.length === 0}
      <Empty.Root>
        <Empty.Header>
          <Empty.Title>{m.messages_empty_title()}</Empty.Title>
          <Empty.Description>{m.messages_empty_description()}</Empty.Description>
        </Empty.Header>
        <Empty.Content>
          <Button variant="outline" onclick={() => chat.composer?.focus()}>
            {m.messages_empty_action()}
          </Button>
        </Empty.Content>
      </Empty.Root>
    {:else}
      {#if messages.loadingOlder}
        <MessageSkeleton />
      {/if}
      {#each messages.list as message (message.id)}
        <Message {message} />
      {/each}
    {/if}
  </div>
</ScrollArea>
