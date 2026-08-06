<script lang="ts">
  import VoiceBar from "$lib/components/voice/voice-bar.svelte";
  import { getChatContext } from "$lib/context/chat.svelte";
  import { channels, messages, voice } from "$lib/stores";
  import { Button } from "&/button";
  import { ChannelType } from "@motus/shared";
  import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";
  import { elasticOut } from "svelte/easing";
  import { fly } from "$lib/motion";
  import ChatHeader from "./chat-header.svelte";
  import { MessageComposer } from "./message-composer";
  import MessageList from "./message-list.svelte";
  import TypingIndicator from "./typing-indicator.svelte";

  const chat = getChatContext();
  const showJumpToPresent = $derived(messages.hasMoreAfter || chat.fromBottom > 200);
</script>

<ChatHeader />

<MessageList />

{#if voice.inCall}
  <div class="sm:hidden">
    <VoiceBar />
  </div>
{/if}

<div class="relative shrink-0">
  {#if showJumpToPresent}
    <div
      class="pointer-events-none absolute inset-x-0 bottom-full flex justify-center pb-2"
      transition:fly={{ duration: 600, easing: elasticOut, y: 40 }}
    >
      <Button
        variant="secondary"
        size="sm"
        class="pointer-events-auto shadow-md"
        onclick={() => chat.backToPresent()}
      >
        <ArrowDownIcon data-icon="inline-start" />
        Jump to present
      </Button>
    </div>
  {/if}

  <TypingIndicator channelId={channels.currentId} />

  <MessageComposer
    bind:this={chat.composer}
    placeholder={`Message #${channels.current?.name ?? ""}`}
    disabled={channels.current?.type !== ChannelType.Text}
    onsend={(text, attachmentIds) => chat.send(text, attachmentIds)}
    ontyping={() => chat.typing()}
    replyingTo={chat.replyTo}
    oncancelreply={() => (chat.replyTo = null)}
  />
</div>
