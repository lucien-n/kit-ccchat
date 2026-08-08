<script lang="ts">
  import * as app from "$lib/app";
  import UserAvatar from "$lib/components/common/user-avatar.svelte";
  import DeafenButton from "$lib/components/voice/deafen-button.svelte";
  import MicButton from "$lib/components/voice/mic-button.svelte";
  import VoiceBar from "$lib/components/voice/voice-bar.svelte";
  import { flip } from "$lib/motion";
  import { m } from "$lib/paraglide/messages";
  import { appearance, channels, session, ui, voice } from "$lib/stores";
  import { ScrollArea } from "&/scroll-area";
  import { ChannelType, type Channel } from "@motus/shared";
  import { dndzone, type DndEvent } from "svelte-dnd-action";
  import { ChannelCategoryHeader, SingleChannel } from "./channel";
  import SidebarHeader from "./sidebar-header.svelte";

  interface Props {
    withVoice?: boolean;
  }

  const { withVoice = false }: Props = $props();

  // Populate the device pickers so mic/headphone selection works before joining.
  $effect(() => {
    if (withVoice) voice.loadDevices();
  });

  // Local mirrors the dnd zones reorder live; kept in sync with the store except
  // while a drag (or its persisting request) is in flight, so a background load
  // can't yank rows mid-drag.
  let textChannels = $state<Channel[]>([]);
  let voiceChannels = $state<Channel[]>([]);
  let isDragging = $state(false);
  let isHoveringParticipant = $state(false);
  let isDraggingParticipant = $state(false);
  $effect(() => {
    if (isDragging) return;
    textChannels = channels.list.filter((c) => c.type === ChannelType.Text);
    voiceChannels = channels.list.filter((c) => c.type === ChannelType.Voice);
  });

  const dndOptions = $derived({
    flipDurationMs: 150,
    dropTargetStyle: {},
    dragDisabled: !session.isAdmin || isHoveringParticipant || isDraggingParticipant,
  });

  async function persistOrder() {
    try {
      await channels.reorder([...textChannels, ...voiceChannels].map((c) => c.id));
    } finally {
      isDragging = false;
    }
  }

  function considerText(e: CustomEvent<DndEvent<Channel>>) {
    isDragging = true;
    textChannels = e.detail.items;
  }
  function finalizeText(e: CustomEvent<DndEvent<Channel>>) {
    textChannels = e.detail.items;
    void persistOrder();
  }
  function considerVoice(e: CustomEvent<DndEvent<Channel>>) {
    isDragging = true;
    voiceChannels = e.detail.items;
  }
  function finalizeVoice(e: CustomEvent<DndEvent<Channel>>) {
    voiceChannels = e.detail.items;
    void persistOrder();
  }

  function handleJoinChannel(channel: Channel) {
    if (channel.type === ChannelType.Voice) {
      voice.join(channel);
    }

    app.selectChannel(channel.id);
    ui.nav = false;
  }
</script>

<SidebarHeader />

<ScrollArea class="min-h-0 flex-1" scrollbarYClasses="my-1 mr-0.5">
  <nav class="p-2">
    <ChannelCategoryHeader
      title={m.channel_category_text()}
      onCreate={() => ui.openCreateChannel(ChannelType.Text)}
    />

    <div
      use:dndzone={{ items: textChannels, type: "text-channels", ...dndOptions }}
      onconsider={considerText}
      onfinalize={finalizeText}
    >
      {#each textChannels as channel (channel.id)}
        <div animate:flip={{ duration: 150 }}>
          <SingleChannel {channel} onSelect={() => handleJoinChannel(channel)} />
        </div>
      {/each}
    </div>

    <ChannelCategoryHeader
      title={m.channel_category_voice()}
      onCreate={() => ui.openCreateChannel(ChannelType.Voice)}
    />

    <div
      use:dndzone={{ items: voiceChannels, type: "voice-channels", ...dndOptions }}
      onconsider={considerVoice}
      onfinalize={finalizeVoice}
    >
      {#each voiceChannels as channel (channel.id)}
        <div animate:flip={{ duration: 150 }}>
          <SingleChannel
            {channel}
            onSelect={() => handleJoinChannel(channel)}
            onMouseEnterParticipant={() => (isHoveringParticipant = true)}
            onMouseLeaveParticipant={() => (isHoveringParticipant = false)}
          />
        </div>
      {/each}
    </div>
  </nav>
</ScrollArea>

{#if withVoice && voice.inCall}
  <VoiceBar />
{/if}

<div class="flex shrink-0 items-center gap-1 border-t p-2">
  <button
    class="hover:bg-sidebar-accent flex min-w-0 flex-1 items-center gap-2 rounded-2xl p-1 pl-1.5"
    title={m.settings_title()}
    onclick={() => ui.openSettings()}
  >
    <UserAvatar
      user={session.user}
      class="size-8 shrink-0"
      fallbackClass="text-xs"
      showPresenceDot
    />
    <div class="min-w-0 flex-1 text-left">
      <div
        class="truncate text-sm font-medium"
        style={appearance.nameStyle(session.user?.color ?? null)}
      >
        {session.user?.displayName}
      </div>
      <div class="text-muted-foreground text-xs">
        {session.isOwner
          ? m.permission_owner()
          : session.isAdmin
            ? m.permission_admin()
            : m.permission_member()}
      </div>
    </div>
  </button>
  {#if withVoice}
    <MicButton />
    <DeafenButton />
  {/if}
</div>
