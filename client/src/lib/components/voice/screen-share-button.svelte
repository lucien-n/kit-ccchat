<script lang="ts">
  import { voice } from "$lib/stores";
  import { Button } from "&/button";
  import ScreenShareIcon from "@lucide/svelte/icons/screen-share";
  import ScreenShareOffIcon from "@lucide/svelte/icons/screen-share-off";

  // getDisplayMedia does not exist on iOS Safari or Android Chrome, so the
  // button would only ever throw there.
  const canScreenShare =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;
</script>

{#if canScreenShare}
  <Button
    variant={voice.isScreenSharing ? "default" : "secondary"}
    size="icon"
    disabled={!voice.canPublish}
    title={voice.isScreenSharing ? "Stop sharing your screen" : "Share your screen"}
    onclick={() => voice.toggleScreenShare()}
  >
    {#if voice.isScreenSharing}
      <ScreenShareOffIcon class="size-4" />
    {:else}
      <ScreenShareIcon class="size-4" />
    {/if}
  </Button>
{/if}
