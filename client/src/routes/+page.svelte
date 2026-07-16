<script lang="ts">
  import { onMount } from "svelte";
  import { init } from "$lib/app";
  import { appearance } from "$lib/appearance.svelte";
  import { community } from "$lib/stores/community.svelte";
  import { session } from "$lib/stores/session.svelte";
  import Login from "$lib/components/Login.svelte";
  import Setup from "$lib/components/Setup.svelte";
  import Chat from "$lib/components/Chat.svelte";

  let ready = $state(false);

  onMount(async () => {
    appearance.init();
    await init();
    ready = true;
  });
</script>

{#if !ready}
  <div class="text-muted-foreground grid min-h-dvh place-items-center">Connecting…</div>
{:else if community.needsSetup}
  <Setup />
{:else if !session.user}
  <Login />
{:else}
  <Chat />
{/if}
