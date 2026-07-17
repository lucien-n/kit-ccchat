<script lang="ts">
  import { init } from "$lib/app";
  import Chat from "$lib/components/Chat.svelte";
  import Login from "$lib/components/Login.svelte";
  import Setup from "$lib/components/Setup.svelte";
  import { appearance } from "$lib/stores/appearance.svelte";
  import { community } from "$lib/stores/community.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { onMount } from "svelte";

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
