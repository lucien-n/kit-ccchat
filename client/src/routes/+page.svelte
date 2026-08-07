<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { init } from "$lib/app";
  import Login from "$lib/components/auth/login.svelte";
  import Chat from "$lib/components/chat/chat.svelte";
  import Setup from "$lib/components/setup/setup.svelte";
  import { setFavicon } from "$lib/favicon";
  import { appearance, community, session } from "$lib/stores";
  import { onMount } from "svelte";

  let ready = $state(false);

  $effect(() => setFavicon(community.iconUrl));

  onMount(async () => {
    appearance.init();
    await init();
    ready = true;
  });
</script>

{#if !ready}
  <div class="text-muted-foreground grid min-h-dvh place-items-center">
    {m.common_connecting()}
  </div>
{:else if community.needsSetup}
  <Setup />
{:else if !session.user}
  <Login />
{:else}
  <Chat />
{/if}
