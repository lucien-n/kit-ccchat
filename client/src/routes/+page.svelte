<script lang="ts">
  import { init } from "$lib/app";
  import Chat from "$lib/components/chat/chat.svelte";
  import Login from "$lib/components/auth/login.svelte";
  import Setup from "$lib/components/setup/setup.svelte";
  import { setFavicon } from "$lib/favicon";
  import { appearance } from "$lib/stores/appearance.svelte";
  import { community } from "$lib/stores/community.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { onMount } from "svelte";

  let ready = $state(false);

  $effect(() => setFavicon(community.iconUrl));

  onMount(async () => {
    appearance.init();
    await init();
    ready = true;

    if (import.meta.env.DEV) {
      const { installVoiceDevTools } = await import("$lib/dev/seedVoice");
      installVoiceDevTools();
    }
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
