<script lang="ts">
  import { chat } from '$lib/chat.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import * as Card from '$lib/components/ui/card';
  import * as Alert from '$lib/components/ui/alert';
  import { TriangleAlert } from '@lucide/svelte';

  let mode = $state<'login' | 'register'>('login');
  let inviteCode = $state('');
  let username = $state('');
  let displayName = $state('');
  let password = $state('');
  let error = $state('');
  let busy = $state(false);

  async function submit(e: Event) {
    e.preventDefault();
    error = '';
    busy = true;
    try {
      if (mode === 'login') {
        await chat.login(username, password);
      } else {
        await chat.register(inviteCode.trim(), username, password, displayName || undefined);
      }
    } catch (err: any) {
      error = err?.message ?? 'something went wrong';
    } finally {
      busy = false;
    }
  }
</script>

<div class="grid min-h-dvh place-items-center p-4">
  <Card.Root class="w-full max-w-md">
    <Card.Header class="text-center">
      <Card.Title class="text-2xl">{chat.serverName}</Card.Title>
      <Card.Description>
        {mode === 'login'
          ? 'Welcome back.'
          : 'Join with an invite code from the server owner.'}
      </Card.Description>
    </Card.Header>

    <form onsubmit={submit}>
      <Card.Content class="space-y-4">
        {#if mode === 'register'}
          <div class="space-y-2">
            <Label for="invite">Invite code</Label>
            <Input id="invite" bind:value={inviteCode} placeholder="paste your invite code" autocomplete="off" />
          </div>
        {/if}

        <div class="space-y-2">
          <Label for="username">Username</Label>
          <Input id="username" bind:value={username} placeholder="lowercase, 2–24 chars" autocomplete="username" />
        </div>

        {#if mode === 'register'}
          <div class="space-y-2">
            <Label for="display">Display name <span class="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="display" bind:value={displayName} placeholder="how others see you" />
          </div>
        {/if}

        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input
            id="password"
            type="password"
            bind:value={password}
            placeholder="at least 8 characters"
            autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
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
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </Button>
        <Button
          type="button"
          variant="link"
          class="text-muted-foreground"
          onclick={() => {
            mode = mode === 'login' ? 'register' : 'login';
            error = '';
          }}
        >
          {mode === 'login' ? 'Have an invite code? Register' : 'Already have an account? Log in'}
        </Button>
      </Card.Footer>
    </form>
  </Card.Root>
</div>
