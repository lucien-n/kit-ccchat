<script lang="ts">
  import { api, avatarUrl } from '$lib/api';
  import { chat } from '$lib/chat.svelte';
  import { cn } from '$lib/utils';
  import { voice } from '$lib/voice.svelte';
  import * as Avatar from '$lib/components/ui/avatar';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Hash, LogOut, Plus, Volume2 } from '@lucide/svelte';
  import VoiceBar from './VoiceBar.svelte';

  // Rendered twice: as the fixed column on desktop, and inside the mobile
  // drawer. Both get full-width labels — the old icon-only rail was unreadable.
  let {
    withVoice = false,
    onNavigate,
    onOpenSettings,
  }: {
    /** Show the in-call bar here. Desktop only: on mobile it lives above the
     *  composer so mute/leave stay reachable without opening the drawer. */
    withVoice?: boolean;
    /** Called after picking a channel, so the mobile drawer can close itself. */
    onNavigate?: () => void;
    onOpenSettings?: () => void;
  } = $props();

  const textChannels = $derived(chat.channels.filter((c) => c.type === 'text'));
  const voiceChannels = $derived(chat.channels.filter((c) => c.type === 'voice'));
  const myAvatar = $derived(chat.user ? avatarUrl(chat.user.id, chat.user.avatarVersion) : null);
  const initial = (name: string | undefined) => (name ?? '?')[0]?.toUpperCase() ?? '?';

  function selectChannel(id: string) {
    chat.selectChannel(id);
    onNavigate?.();
  }

  function joinVoice(c: { id: string; name: string }) {
    if (!chat.token) return;
    voice.join({ id: c.id, name: c.name }, chat.token);
    onNavigate?.();
  }

  async function createChannel() {
    const name = prompt('New channel name?');
    if (!name || !chat.token) return;
    await api.createChannel(chat.token, { name, type: 'text' });
    await chat.loadChannels();
  }
</script>

<header class="flex h-12 shrink-0 items-center gap-2 border-b px-4 font-semibold">
  <span class="truncate">{chat.serverName}</span>
  <span
    class={cn(
      'bg-muted-foreground ml-auto size-2 shrink-0 rounded-full',
      chat.status === 'connected' && 'bg-green-500',
      chat.status === 'connecting' && 'bg-amber-500',
    )}
    title={chat.status}
  ></span>
</header>

<nav class="min-h-0 flex-1 overflow-y-auto p-2">
  <div class="flex items-center justify-between px-2 pt-2 pb-1">
    <span class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Text</span>
    {#if chat.isAdmin}
      <Button variant="ghost" size="icon" class="size-6" title="Create channel" onclick={createChannel}>
        <Plus class="size-4" />
      </Button>
    {/if}
  </div>

  {#each textChannels as c (c.id)}
    <Button
      variant="ghost"
      class={cn(
        'text-muted-foreground h-10 w-full justify-start gap-2 px-2 font-normal sm:h-8',
        c.id === chat.currentChannelId && 'bg-sidebar-accent text-sidebar-accent-foreground',
      )}
      onclick={() => selectChannel(c.id)}
    >
      <Hash class="size-4 shrink-0" />
      <span class="truncate">{c.name}</span>
      {#if (chat.unread[c.id] ?? 0) > 0}
        <Badge variant="destructive" class="ml-auto h-5 min-w-5 justify-center px-1.5">
          {chat.unread[c.id]}
        </Badge>
      {/if}
    </Button>
  {/each}

  <div class="px-2 pt-4 pb-1">
    <span class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Voice</span>
  </div>

  {#each voiceChannels as c (c.id)}
    {@const members = chat.voicePresence[c.id] ?? []}
    <div>
      <Button
        variant="ghost"
        class={cn(
          'text-muted-foreground h-10 w-full justify-start gap-2 px-2 font-normal sm:h-8',
          c.id === voice.channelId && 'bg-sidebar-accent text-sidebar-accent-foreground',
        )}
        title="Join voice"
        onclick={() => joinVoice(c)}
      >
        <Volume2 class="size-4 shrink-0" />
        <span class="truncate">{c.name}</span>
        {#if members.length > 0}
          <Badge variant="secondary" class="ml-auto h-5 min-w-5 justify-center px-1.5">
            {members.length}
          </Badge>
        {/if}
      </Button>

      {#if members.length > 0}
        <div class="mt-0.5 mb-1 ml-4 flex flex-col gap-0.5">
          {#each members as m (m.id)}
            {@const av = avatarUrl(m.id, m.avatarVersion)}
            {@const speaking =
              c.id === voice.channelId &&
              voice.participants.find((p) => p.identity === m.id)?.speaking}
            <div class="flex items-center gap-2 px-2 py-1">
              <Avatar.Root class={cn('size-5 shrink-0', speaking && 'ring-2 ring-green-500')}>
                {#if av}<Avatar.Image src={av} alt="" />{/if}
                <Avatar.Fallback class="bg-primary/70 text-primary-foreground text-[9px]">
                  {(m.name[0] ?? '?').toUpperCase()}
                </Avatar.Fallback>
              </Avatar.Root>
              <span class="text-muted-foreground truncate text-xs">{m.name}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
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
    <Avatar.Root class="size-8 shrink-0">
      {#if myAvatar}<Avatar.Image src={myAvatar} alt="" />{/if}
      <Avatar.Fallback class="bg-primary text-primary-foreground text-xs">
        {initial(chat.user?.displayName)}
      </Avatar.Fallback>
    </Avatar.Root>
    <div class="min-w-0 flex-1 text-left">
      <div class="truncate text-sm font-medium">{chat.user?.displayName}</div>
      <div class="text-muted-foreground text-xs">{chat.user?.role}</div>
    </div>
  </button>
  <Button variant="ghost" size="icon" class="shrink-0" title="Log out" onclick={() => chat.logout()}>
    <LogOut class="size-4" />
  </Button>
</div>
