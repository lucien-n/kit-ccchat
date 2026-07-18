<script lang="ts">
  import { avatarUrl } from "$lib/api";
  import * as app from "$lib/app";
  import UserAvatar from "$lib/components/common/UserAvatar.svelte";
  import { Button } from "$lib/components/ui/button";
  import VoiceBar from "$lib/components/voice/VoiceBar.svelte";
  import { channels } from "$lib/stores/channels.svelte";
  import { community } from "$lib/stores/community.svelte";
  import { realtime } from "$lib/stores/realtime.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { voice } from "$lib/stores/voice.svelte";
  import { cn } from "$lib/utils";
  import { ChannelType } from "@ccchat/shared";
  import { LogOut, Plus, Settings } from "@lucide/svelte";
  import SingleChannelRow from "./SingleChannelRow.svelte";

  interface Props {
    withVoice?: boolean;
    onNavigate?: () => void;
    onOpenSettings?: () => void;
    onOpenCommunitySettings?: () => void;
    onCreateChannel?: (type: ChannelType) => void;
  }

  let {
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
  const myAvatar = $derived(
    session.user ? avatarUrl(session.user.id, session.user.avatarVersion) : null,
  );

  function handleSelectChannel(id: string) {
    app.selectChannel(id);
    onNavigate?.();
  }

  function handleJoinVoice(channel: { id: string; name: string }) {
    if (!session.token) return;
    voice.join(channel, session.token);
    onNavigate?.();
  }

  function createChannel(type: ChannelType) {
    onCreateChannel?.(type);
    onNavigate?.();
  }
</script>

<header class="flex h-12 shrink-0 items-center gap-2 border-b px-4 font-semibold">
  <span class="truncate">{community.name}</span>
  <div class="ml-auto flex shrink-0 items-center gap-1">
    {#if session.isAdmin}
      <Button
        variant="ghost"
        size="icon"
        class="size-7"
        title="Community settings"
        onclick={() => onOpenCommunitySettings?.()}
      >
        <Settings class="size-4" />
      </Button>
    {/if}
    <span
      class={cn(
        "bg-muted-foreground size-2 shrink-0 rounded-full",
        realtime.status === "connected" && "bg-green-500",
        realtime.status === "connecting" && "bg-amber-500",
      )}
      title={realtime.status}
    ></span>
  </div>
</header>

<nav class="min-h-0 flex-1 overflow-y-auto p-2">
  <div class="flex items-center justify-between px-2 pt-2 pb-1">
    <span class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
      Text
    </span>
    {#if session.isAdmin}
      <Button
        variant="ghost"
        size="icon"
        class="size-6"
        title="Create text channel"
        onclick={() => createChannel(ChannelType.Text)}
      >
        <Plus class="size-4" />
      </Button>
    {/if}
  </div>

  {#each textChannels as channel (channel.id)}
    <SingleChannelRow {channel} onSelect={() => handleSelectChannel(channel.id)} />
  {/each}

  <div class="flex items-center justify-between px-2 pt-4 pb-1">
    <span class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
      Voice
    </span>
    {#if session.isAdmin}
      <Button
        variant="ghost"
        size="icon"
        class="size-6"
        title="Create voice channel"
        onclick={() => createChannel(ChannelType.Voice)}
      >
        <Plus class="size-4" />
      </Button>
    {/if}
  </div>

  {#each voiceChannels as channel (channel.id)}
    <SingleChannelRow {channel} onSelect={() => handleJoinVoice(channel)} />
  {/each}
</nav>

{#if withVoice && voice.inCall}
  <VoiceBar />
{/if}

<div class="flex shrink-0 items-center gap-1 border-t p-2">
  <button
    class="hover:bg-sidebar-accent flex min-w-0 flex-1 items-center gap-2 rounded p-1"
    title="Settings"
    onclick={() => onOpenSettings?.()}
  >
    <UserAvatar
      src={myAvatar}
      name={session.user?.displayName}
      class="size-8 shrink-0"
      fallbackClass="text-xs"
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
