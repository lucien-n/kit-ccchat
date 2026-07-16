<script lang="ts">
  import { chat } from "$lib/chat.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { inviteLink } from "$lib/invite";
  import { Check, Copy, TriangleAlert } from "@lucide/svelte";

  let communityName = $state("");
  let username = $state("");
  let password = $state("");
  let error = $state("");
  let busy = $state(false);

  let inviteCode = $state("");
  let copied = $state(false);
  const link = $derived(inviteCode ? inviteLink(inviteCode) : "");

  async function submit(e: Event) {
    e.preventDefault();
    error = "";
    busy = true;
    try {
      inviteCode = await chat.setup({ communityName, username, password });
    } catch (err: any) {
      error = err?.message ?? "something went wrong";
    } finally {
      busy = false;
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(link);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<div class="grid min-h-dvh place-items-center p-4">
  <Card.Root class="w-full max-w-md">
    {#if inviteCode}
      <Card.Header class="text-center">
        <Card.Title class="text-2xl">{chat.serverName} is live</Card.Title>
        <Card.Description
          >Send this link to your friends so they can join.</Card.Description
        >
      </Card.Header>

      <Card.Content class="space-y-4">
        <button
          type="button"
          onclick={copy}
          class="bg-muted hover:bg-muted/70 flex w-full items-center justify-between gap-3 rounded-lg px-4 py-4 text-left transition-colors"
        >
          <span class="font-mono text-sm break-all">{link}</span>
          {#if copied}
            <Check class="size-5 shrink-0 text-emerald-500" />
          {:else}
            <Copy class="text-muted-foreground size-5 shrink-0" />
          {/if}
        </button>
        <p class="text-muted-foreground text-center text-sm">
          Clicking it opens ccchat with the code already filled in. It never
          expires and any number of people can use it — the code on its own is
          <code class="bg-muted rounded px-1 py-0.5 font-mono"
            >{inviteCode}</code
          >.
        </p>
      </Card.Content>

      <Card.Footer class="mt-2">
        <Button class="w-full" onclick={() => (chat.needsSetup = false)}
          >Enter {chat.serverName}</Button
        >
      </Card.Footer>
    {:else}
      <Card.Header class="text-center">
        <Card.Title class="text-2xl">Welcome to ccchat</Card.Title>
        <Card.Description>
          This community is brand new. Name it and create your owner account —
          you'll get an invite code for your friends.
        </Card.Description>
      </Card.Header>

      <form onsubmit={submit}>
        <Card.Content class="space-y-4">
          <div class="space-y-2">
            <Label for="community">Community name</Label>
            <Input
              id="community"
              bind:value={communityName}
              placeholder="e.g. The Group Chat"
              autocomplete="off"
            />
          </div>

          <div class="space-y-2">
            <Label for="username">Your username</Label>
            <Input
              id="username"
              bind:value={username}
              placeholder="lowercase, 2–24 chars"
              autocomplete="username"
            />
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
            {busy ? "Creating…" : "Create community"}
          </Button>
          <p class="text-muted-foreground text-center text-xs">
            Whoever fills this in first becomes the owner, so do it now — before
            you share the address.
          </p>
        </Card.Footer>
      </form>
    {/if}
  </Card.Root>
</div>
