<script lang="ts">
  import { chat } from '$lib/chat.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';
  import * as Alert from '$lib/components/ui/alert';
  import { TriangleAlert, Check, Copy } from '@lucide/svelte';

  // Shown once, on a brand-new instance. Replaces every OWNER_* setting a
  // self-hoster would otherwise have to put in a file before starting.
  let communityName = $state('');
  let username = $state('');
  let password = $state('');
  let error = $state('');
  let busy = $state(false);

  // Set once setup succeeds. We deliberately stay on this screen instead of
  // dropping straight into the chat: the invite code is shown exactly once and
  // it's the thing the owner actually came here for.
  let inviteCode = $state('');
  let copied = $state(false);

  async function submit(e: Event) {
    e.preventDefault();
    error = '';
    busy = true;
    try {
      inviteCode = await chat.setup({ communityName, username, password });
    } catch (err: any) {
      error = err?.message ?? 'something went wrong';
    } finally {
      busy = false;
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(inviteCode);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<div class="grid min-h-dvh place-items-center p-4">
  <Card.Root class="w-full max-w-md">
    {#if inviteCode}
      <Card.Header class="text-center">
        <Card.Title class="text-2xl">{chat.serverName} is live</Card.Title>
        <Card.Description>Share this invite code with your friends so they can join.</Card.Description>
      </Card.Header>

      <Card.Content class="space-y-4">
        <button
          type="button"
          onclick={copy}
          class="bg-muted hover:bg-muted/70 flex w-full items-center justify-center gap-3 rounded-lg py-6 font-mono text-2xl tracking-widest transition-colors"
        >
          {inviteCode}
          {#if copied}
            <Check class="size-5 text-emerald-500" />
          {:else}
            <Copy class="text-muted-foreground size-5" />
          {/if}
        </button>
        <p class="text-muted-foreground text-center text-sm">
          It never expires and any number of people can use it. You can create more — or revoke this
          one — from the members panel later.
        </p>
      </Card.Content>

      <Card.Footer class="mt-2">
        <Button class="w-full" onclick={() => (chat.needsSetup = false)}>Enter {chat.serverName}</Button>
      </Card.Footer>
    {:else}
      <Card.Header class="text-center">
        <Card.Title class="text-2xl">Welcome to ccchat</Card.Title>
        <Card.Description>
          This community is brand new. Name it and create your owner account — you'll get an invite
          code for your friends.
        </Card.Description>
      </Card.Header>

      <form onsubmit={submit}>
        <Card.Content class="space-y-4">
          <div class="space-y-2">
            <Label for="community">Community name</Label>
            <Input id="community" bind:value={communityName} placeholder="e.g. Babord" autocomplete="off" />
          </div>

          <div class="space-y-2">
            <Label for="username">Your username</Label>
            <Input id="username" bind:value={username} placeholder="lowercase, 2–24 chars" autocomplete="username" />
          </div>

          <div class="space-y-2">
            <Label for="password">Your password</Label>
            <Input
              id="password"
              type="password"
              bind:value={password}
              placeholder="at least 8 characters"
              autocomplete="new-password"
            />
          </div>

          {#if error}
            <Alert.Root variant="destructive">
              <TriangleAlert class="size-4" />
              <Alert.Description>{error}</Alert.Description>
            </Alert.Root>
          {/if}
        </Card.Content>

        <Card.Footer class="mt-6 flex-col gap-3">
          <Button type="submit" class="w-full" disabled={busy}>
            {busy ? 'Creating…' : 'Create community'}
          </Button>
          <p class="text-muted-foreground text-center text-xs">
            Whoever fills this in first becomes the owner, so do it now — before you share the
            address.
          </p>
        </Card.Footer>
      </form>
    {/if}
  </Card.Root>
</div>
