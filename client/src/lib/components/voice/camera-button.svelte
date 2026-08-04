<script lang="ts">
  import { voice } from "$lib/stores";
  import { Button } from "&/button";
  import VideoIcon from "@lucide/svelte/icons/video";
  import VideoOffIcon from "@lucide/svelte/icons/video-off";

  interface Props {
    class?: string;
  }
  const { class: className }: Props = $props();

  // No getUserMedia means no camera to publish (locked-down or insecure context).
  const canUseCamera =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
</script>

{#if canUseCamera}
  <Button
    variant={voice.isCameraOn ? "default" : "secondary"}
    size="icon"
    disabled={!voice.canPublish}
    title={voice.isCameraOn ? "Turn off your camera" : "Turn on your camera"}
    onclick={() => voice.toggleCamera()}
    class={className}
  >
    {#if voice.isCameraOn}
      <VideoOffIcon class="size-4" />
    {:else}
      <VideoIcon class="size-4" />
    {/if}
  </Button>
{/if}
