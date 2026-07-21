<script lang="ts">
  import * as app from "$lib/app";
  import UserAvatar from "$lib/components/common/UserAvatar.svelte";
  import { Button } from "$lib/components/ui/button";
  import VoiceBar from "$lib/components/voice/VoiceBar.svelte";
  import { channels } from "$lib/stores/channels.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { voice } from "$lib/stores/voice.svelte";
  import { ChannelType } from "@ccchat/shared";
  import { LogOut } from "@lucide/svelte";
  import SidebarHeader from "./SidebarHeader.svelte";
  import { ChannelCategoryHeader, SingleChannel } from "./channel";

  interface Props {
    withVoice?: boolean;
    onNavigate?: () => void;
    onOpenSettings: () => void;
    onOpenCommunitySettings: () => void;
    onCreateChannel: (type: ChannelType) => void;
  }

  const {
    withVoice = false,
    onNavigate,
    onOpenSettings,
    onOpenCommunitySettings,
    onCreateChannel,
  }: Props = $props();

  const textChannels = $derived(channels.list.filter((c) => c.type === ChannelType.Text));
  const voiceChannels = $derived(
    channels.list.filter((c) => c.type === ChannelType.Voice),
  );

  function handleSelectChannel(id: string) {
    app.selectChannel(id);
    onNavigate?.();
  }

  function handleJoinVoice(channel: { id: string; name: string }) {
    voice.join(channel);
    onNavigate?.();
  }

  function handleCreateChannel(type: ChannelType) {
    onCreateChannel?.(type);
    onNavigate?.();
  }
</script>

<SidebarHeader {onOpenCommunitySettings} />

<nav class="min-h-0 flex-1 overflow-y-auto p-2">
  <ChannelCategoryHeader
    title="Text"
    onCreate={() => handleCreateChannel(ChannelType.Text)}
  />

  {#each textChannels as channel (channel.id)}
    <SingleChannel {channel} onSelect={() => handleSelectChannel(channel.id)} />
  {/each}

  <ChannelCategoryHeader
    title="Voice"
    onCreate={() => handleCreateChannel(ChannelType.Voice)}
  />

  {#each voiceChannels as channel (channel.id)}
    <SingleChannel {channel} onSelect={() => handleJoinVoice(channel)} />
  {/each}
</nav>

{#if withVoice && voice.inCall}
  <VoiceBar />
{/if}

<div class="flex shrink-0 items-center gap-1 border-t p-2">
  <button
    class="hover:bg-sidebar-accent flex min-w-0 flex-1 items-center gap-2 rounded-2xl p-1"
    title="Settings"
    onclick={() => onOpenSettings?.()}
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
        style={session.user?.color ? `color:${session.user.color}` : undefined}
      >
        {session.user?.displayName}
      </div>
      <div class="text-muted-foreground text-xs">
        {session.isOwner ? "owner" : session.isAdmin ? "admin" : "member"}
      </div>
    </div>
  </button>
  <Button
    variant="ghost"
    size="icon"
    class="shrink-0"
    title="Log out"
    onclick={() => app.logout()}
  >
    <LogOut class="size-4" />
  </Button>
</div>
