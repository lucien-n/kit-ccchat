<script lang="ts">
  import { onMount } from "svelte";
  import { chat } from "$lib/chat.svelte";
  import { appearance } from "$lib/appearance.svelte";
  import Login from "$lib/components/Login.svelte";
  import Setup from "$lib/components/Setup.svelte";
  import Chat from "$lib/components/Chat.svelte";

  let ready = $state(false);

  onMount(async () => {
    appearance.init();
    await chat.init();
    ready = true;
  });
</script>

{#if !ready}
  <div class="text-muted-foreground grid min-h-dvh place-items-center">Connecting…</div>
{:else if chat.needsSetup}
  <Setup />
{:else if !chat.user}
  <Login />
{:else}
  <Chat />
{/if}
