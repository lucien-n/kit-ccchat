<script lang="ts">
  import { chat } from '$lib/chat.svelte';
  import { api, avatarUrl, type PublicUser } from '$lib/api';
  import { cn } from '$lib/utils';
  import * as Sheet from '$lib/components/ui/sheet';
  import * as Avatar from '$lib/components/ui/avatar';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  type Member = PublicUser & { banned: number; mutedUntil: number | null };
  let members = $state<Member[]>([]);
  let error = $state('');

  async function load() {
    if (!chat.token) return;
    error = '';
    try {
      members = (await api.members(chat.token)).members;
    } catch (e: any) {
      error = e?.message ?? 'failed to load members';
    }
  }

  async function act(id: string, action: 'kick' | 'ban' | 'unban' | 'mute' | 'unmute') {
    if (!chat.token) return;
    error = '';
    try {
      const body = action === 'mute' ? { minutes: 60 } : undefined;
      await api.mod(chat.token, id, action, body);
      await load();
    } catch (e: any) {
      error = e?.message ?? 'action failed';
    }
  }

  const isMuted = (m: Member) => m.mutedUntil != null && m.mutedUntil > Date.now();
  const initial = (name: string) => name[0]?.toUpperCase() ?? '?';

  // Refresh the roster each time the panel opens.
  $effect(() => {
    if (open) load();
  });
</script>

<Sheet.Root bind:open>
  <Sheet.Content side="right" class="flex w-80 flex-col gap-0 sm:max-w-sm">
    <Sheet.Header>
      <Sheet.Title>Members</Sheet.Title>
    </Sheet.Header>

    {#if error}
      <p class="text-destructive px-4 text-sm">{error}</p>
    {/if}

    <div class="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
      {#each members as m (m.id)}
        <div class="hover:bg-muted/50 rounded-md p-2">
          <div class="flex items-center gap-2">
            <span
              class={cn(
                'bg-muted-foreground size-2 shrink-0 rounded-full',
                chat.online.has(m.id) && 'bg-green-500',
              )}
            ></span>
            {@const av = avatarUrl(m.id, m.avatarVersion)}
            <Avatar.Root class="size-7">
              {#if av}<Avatar.Image src={av} alt="" />{/if}
              <Avatar.Fallback class="bg-primary text-primary-foreground text-xs">
                {initial(m.displayName)}
              </Avatar.Fallback>
            </Avatar.Root>
            <div class="flex min-w-0 flex-1 items-center gap-1.5">
              <span class="truncate text-sm font-medium">{m.displayName}</span>
              <span class="text-muted-foreground text-[10px] uppercase">{m.role}</span>
            </div>
            {#if m.banned}<Badge variant="destructive">banned</Badge>{/if}
            {#if isMuted(m)}<Badge variant="secondary">muted</Badge>{/if}
          </div>

          {#if m.id !== chat.user?.id && m.role !== 'owner'}
            <div class="flex flex-wrap gap-1 pt-2 pl-9">
              {#if isMuted(m)}
                <Button variant="outline" size="sm" class="h-7" onclick={() => act(m.id, 'unmute')}>unmute</Button>
              {:else}
                <Button variant="outline" size="sm" class="h-7" onclick={() => act(m.id, 'mute')}>mute</Button>
              {/if}
              <Button variant="outline" size="sm" class="h-7" onclick={() => act(m.id, 'kick')}>kick</Button>
              {#if m.banned}
                <Button variant="outline" size="sm" class="h-7" onclick={() => act(m.id, 'unban')}>unban</Button>
              {:else}
                <Button variant="destructive" size="sm" class="h-7" onclick={() => act(m.id, 'ban')}>ban</Button>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </Sheet.Content>
</Sheet.Root>
