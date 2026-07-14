<script lang="ts">
  import { onMount } from 'svelte';
  import { chat } from '$lib/chat.svelte';
  import Login from '$lib/components/Login.svelte';
  import Chat from '$lib/components/Chat.svelte';

  let ready = $state(false);

  onMount(async () => {
    await chat.init();
    ready = true;
  });
</script>

{#if !ready}
  <div class="grid min-h-dvh place-items-center text-muted-foreground">Connecting…</div>
{:else if !chat.user}
  <Login />
{:else}
  <Chat />
{/if}
