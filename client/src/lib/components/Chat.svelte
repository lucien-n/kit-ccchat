<script lang="ts">
  import { chat } from '$lib/chat.svelte';
  import { voice } from '$lib/voice.svelte';
  import { api, avatarUrl } from '$lib/api';
  import { setBaseTitle, setTitleBadge } from '$lib/notify';
  import { cn } from '$lib/utils';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Badge } from '$lib/components/ui/badge';
  import * as Avatar from '$lib/components/ui/avatar';
  import * as Alert from '$lib/components/ui/alert';
  import {
    Hash,
    Volume2,
    Bell,
    BellOff,
    LogOut,
    Plus,
    Trash2,
    Send,
    Users,
    Settings as SettingsIcon,
    TriangleAlert,
  } from '@lucide/svelte';
  import Members from './Members.svelte';
  import VoiceBar from './VoiceBar.svelte';
  import Settings from './Settings.svelte';

  let draft = $state('');
  let showMembers = $state(false);
  let showSettings = $state(false);
  let inviteCode = $state('');
  let scroller: HTMLDivElement | null = $state(null);

  const textChannels = $derived(chat.channels.filter((c) => c.type === 'text'));
  const voiceChannels = $derived(chat.channels.filter((c) => c.type === 'voice'));

  // Auto-scroll to the newest message whenever the list changes.
  $effect(() => {
    void chat.messages.length;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  });

  // Reflect total unread count in the browser tab title.
  $effect(() => {
    setBaseTitle(chat.serverName);
    setTitleBadge(chat.totalUnread);
  });

  function sendDraft(e: Event) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    chat.send(text);
    draft = '';
  }

  async function createChannel() {
    const name = prompt('New channel name?');
    if (!name || !chat.token) return;
    await api.createChannel(chat.token, { name, type: 'text' });
    await chat.loadChannels();
  }

  async function makeInvite() {
    if (!chat.token) return;
    const { invite } = await api.createInvite(chat.token, { maxUses: 0 });
    inviteCode = invite.code;
  }

  function joinVoice(c: { id: string; name: string }) {
    if (!chat.token) return;
    voice.join({ id: c.id, name: c.name }, chat.token);
  }

  function fmtTime(ts: number) {
    return new Date(ts).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const canDelete = (authorId: string | undefined) => chat.isAdmin || authorId === chat.user?.id;
  const initial = (name: string | undefined) => (name ?? '?')[0]?.toUpperCase() ?? '?';
</script>

<div class="grid h-dvh grid-cols-[64px_1fr] sm:grid-cols-[248px_1fr]">
  <!-- Channel sidebar -->
  <aside class="bg-sidebar text-sidebar-foreground flex min-h-0 flex-col border-r">
    <header class="flex h-12 items-center gap-2 border-b px-4 font-semibold">
      <span class="hidden truncate sm:inline">{chat.serverName}</span>
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
        <span class="text-muted-foreground hidden text-xs font-semibold tracking-wide uppercase sm:inline">Text</span>
        {#if chat.isAdmin}
          <Button variant="ghost" size="icon" class="size-5" title="Create channel" onclick={createChannel}>
            <Plus class="size-4" />
          </Button>
        {/if}
      </div>
      {#each textChannels as c (c.id)}
        <Button
          variant="ghost"
          class={cn(
            'text-muted-foreground h-8 w-full justify-start gap-2 px-2 font-normal',
            c.id === chat.currentChannelId && 'bg-sidebar-accent text-sidebar-accent-foreground',
          )}
          onclick={() => chat.selectChannel(c.id)}
        >
          <Hash class="size-4 shrink-0" />
          <span class="hidden truncate sm:inline">{c.name}</span>
          {#if (chat.unread[c.id] ?? 0) > 0}
            <Badge variant="destructive" class="ml-auto h-5 min-w-5 justify-center px-1.5">
              {chat.unread[c.id]}
            </Badge>
          {/if}
        </Button>
      {/each}

      <div class="px-2 pt-4 pb-1">
        <span class="text-muted-foreground hidden text-xs font-semibold tracking-wide uppercase sm:inline">Voice</span>
      </div>
      {#each voiceChannels as c (c.id)}
        {@const members = chat.voicePresence[c.id] ?? []}
        <div>
          <Button
            variant="ghost"
            class={cn(
              'text-muted-foreground h-8 w-full justify-start gap-2 px-2 font-normal',
              c.id === voice.channelId && 'bg-sidebar-accent text-sidebar-accent-foreground',
            )}
            title="Join voice"
            onclick={() => joinVoice(c)}
          >
            <Volume2 class="size-4 shrink-0" />
            <span class="hidden truncate sm:inline">{c.name}</span>
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
                <div class="flex items-center gap-2 px-2 py-0.5">
                  <Avatar.Root class={cn('size-5 shrink-0', speaking && 'ring-2 ring-green-500')}>
                    {#if av}<Avatar.Image src={av} alt="" />{/if}
                    <Avatar.Fallback class="bg-primary/70 text-primary-foreground text-[9px]">
                      {(m.name[0] ?? '?').toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar.Root>
                  <span class="text-muted-foreground hidden truncate text-xs sm:inline">{m.name}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </nav>

    {#if voice.inCall}
      <VoiceBar />
    {/if}

    <div class="flex items-center gap-2 border-t p-2">
      <Avatar.Root class="size-8">
        <Avatar.Fallback class="bg-primary text-primary-foreground text-xs">
          {initial(chat.user?.displayName)}
        </Avatar.Fallback>
      </Avatar.Root>
      <div class="hidden min-w-0 flex-1 sm:block">
        <div class="truncate text-sm font-medium">{chat.user?.displayName}</div>
        <div class="text-muted-foreground text-xs">{chat.user?.role}</div>
      </div>
      <Button variant="ghost" size="icon" title="Log out" onclick={() => chat.logout()}>
        <LogOut class="size-4" />
      </Button>
    </div>
  </aside>

  <!-- Main channel view -->
  <main class="bg-background flex min-w-0 flex-col">
    <header class="flex h-12 items-center justify-between border-b px-4">
      <div class="flex items-center gap-1.5 font-semibold">
        <Hash class="text-muted-foreground size-5" />
        {chat.currentChannel?.name ?? 'no channel'}
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          title={chat.soundEnabled ? 'Mute notification sound' : 'Unmute notification sound'}
          onclick={() => chat.toggleSound()}
        >
          {#if chat.soundEnabled}<Bell class="size-4" />{:else}<BellOff class="size-4" />{/if}
        </Button>
        <span class="text-muted-foreground hidden text-sm sm:inline">{chat.online.size} online</span>
        {#if chat.isAdmin}
          <Button variant="outline" size="sm" onclick={makeInvite}>Invite</Button>
          <Button variant="outline" size="sm" onclick={() => (showMembers = true)}>
            <Users class="size-4" /> Members
          </Button>
        {/if}
      </div>
    </header>

    {#if inviteCode}
      <div class="bg-muted/50 flex items-center gap-3 border-b px-4 py-2 text-sm">
        <span>Invite code:</span>
        <code class="bg-background rounded px-2 py-0.5 font-mono">{inviteCode}</code>
        <Button variant="ghost" size="sm" class="ml-auto" onclick={() => (inviteCode = '')}>dismiss</Button>
      </div>
    {/if}

    {#if voice.error}
      <Alert.Root variant="destructive" class="m-3 w-auto">
        <TriangleAlert class="size-4" />
        <Alert.Description class="flex items-center justify-between gap-3">
          <span>{voice.error}</span>
          <Button variant="ghost" size="sm" onclick={() => (voice.error = '')}>dismiss</Button>
        </Alert.Description>
      </Alert.Root>
    {/if}

    <div bind:this={scroller} class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-4">
      {#each chat.messages as m (m.id)}
        <div class="group hover:bg-muted/40 relative flex gap-3 rounded-md px-2 py-1">
          <Avatar.Root class="mt-0.5 size-9">
            <Avatar.Fallback class="bg-primary text-primary-foreground text-sm">
              {initial(m.author?.displayName)}
            </Avatar.Fallback>
          </Avatar.Root>
          <div class="min-w-0">
            <div class="flex items-baseline gap-2">
              <span class="font-semibold">{m.author?.displayName ?? 'unknown'}</span>
              <span class="text-muted-foreground text-xs">{fmtTime(m.createdAt)}</span>
            </div>
            <div class="break-words whitespace-pre-wrap">{m.content}</div>
          </div>
          {#if canDelete(m.author?.id)}
            <Button
              variant="ghost"
              size="icon"
              class="absolute top-1 right-2 size-7 opacity-0 group-hover:opacity-100"
              title="Delete"
              onclick={() => chat.deleteMessage(m.id)}
            >
              <Trash2 class="size-4" />
            </Button>
          {/if}
        </div>
      {:else}
        <div class="text-muted-foreground m-auto">No messages yet. Say hi 👋</div>
      {/each}
    </div>

    <form class="flex gap-2 p-4" onsubmit={sendDraft}>
      <Input
        bind:value={draft}
        placeholder={`Message #${chat.currentChannel?.name ?? ''}`}
        disabled={chat.currentChannel?.type !== 'text'}
        class="flex-1"
      />
      <Button type="submit" size="icon"><Send class="size-4" /></Button>
    </form>
  </main>

  <Members bind:open={showMembers} />
</div>
