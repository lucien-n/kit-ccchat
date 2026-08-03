<script lang="ts">
  import { voice } from "$lib/stores";
  import { Button } from "&/button";
  import MaximizeIcon from "@lucide/svelte/icons/maximize";
  import MinimizeIcon from "@lucide/svelte/icons/minimize";
  import Volume2Icon from "@lucide/svelte/icons/volume-2";
  import VolumeXIcon from "@lucide/svelte/icons/volume-x";
  import XIcon from "@lucide/svelte/icons/x";

  let el = $state<HTMLVideoElement | null>(null);
  let shell = $state<HTMLElement | null>(null);
  let fullscreen = $state(false);

  const track = $derived(voice.watching ? voice.screens[voice.watching] : null);
  const name = $derived(
    voice.participants.find((p) => p.identity === voice.watching)?.name ?? "someone",
  );
  // Present only while the watched stream is publishing sound.
  const audio = $derived(voice.watching ? voice.screenAudio[voice.watching] : undefined);
  const silent = $derived(!audio || audio.muted || audio.volume === 0);

  // adaptiveStream only pulls frames for an attached, visible element, so the
  // stream costs nothing until this mounts.
  $effect(() => {
    const node = el;
    const current = track;
    if (!node || !current) return;
    current.attach(node);
    return () => {
      current.detach(node);
    };
  });

  // Escape and the browser's own controls exit without touching our button.
  $effect(() => {
    const onChange = () => (fullscreen = document.fullscreenElement === shell);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  });

  async function toggleFullscreen() {
    if (!shell) return;
    try {
      if (document.fullscreenElement === shell) await document.exitFullscreen();
      else await shell.requestFullscreen();
    } catch {
      /* the browser refused it, the inline view still works */
    }
  }
</script>

<div bind:this={shell} class="bg-background flex min-h-0 flex-1 flex-col">
  <div class="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-1.5">
    <span class="text-muted-foreground min-w-0 truncate text-xs">
      Watching <span class="text-foreground font-medium">{name}</span>
    </span>
    <div class="flex shrink-0 items-center gap-0.5">
      {#if audio && voice.watching}
        {@const watching = voice.watching}
        <Button
          variant="ghost"
          size="icon-xs"
          title={silent ? "Unmute stream" : "Mute stream"}
          onclick={() => voice.toggleStreamMute(watching)}
        >
          {#if silent}
            <VolumeXIcon class="size-4" />
          {:else}
            <Volume2Icon class="size-4" />
          {/if}
        </Button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={audio.muted ? 0 : audio.volume}
          oninput={(e) => voice.setStreamVolume(watching, e.currentTarget.valueAsNumber)}
          class="stream-volume mr-1 w-20 cursor-pointer"
          title="Stream volume"
          aria-label="Stream volume"
        />
      {/if}
      <Button
        variant="ghost"
        size="icon-xs"
        title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        onclick={toggleFullscreen}
      >
        {#if fullscreen}
          <MinimizeIcon class="size-4" />
        {:else}
          <MaximizeIcon class="size-4" />
        {/if}
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        title="Back to chat"
        onclick={() => voice.stopWatching()}
      >
        <XIcon class="size-4" />
      </Button>
    </div>
  </div>

  <video
    bind:this={el}
    autoplay
    muted
    playsinline
    ondblclick={toggleFullscreen}
    class="min-h-0 w-full flex-1 bg-black object-contain"
  ></video>
</div>

<style>
  /* Native range styled to the theme: a slim track with a small primary thumb,
     matching the compact ghost-button row it sits in. */
  .stream-volume {
    height: 0.25rem;
    appearance: none;
    -webkit-appearance: none;
    border-radius: 9999px;
    background: var(--muted);
  }
  .stream-volume::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 0.75rem;
    width: 0.75rem;
    border-radius: 9999px;
    background: var(--primary);
  }
  .stream-volume::-moz-range-thumb {
    height: 0.75rem;
    width: 0.75rem;
    border: none;
    border-radius: 9999px;
    background: var(--primary);
  }
</style>
