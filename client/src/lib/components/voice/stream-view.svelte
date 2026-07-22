<script lang="ts">
  import { voice } from "$lib/stores/voice.svelte";
  import { Button } from "&/button";
  import MaximizeIcon from "@lucide/svelte/icons/maximize";
  import MinimizeIcon from "@lucide/svelte/icons/minimize";
  import XIcon from "@lucide/svelte/icons/x";

  let el = $state<HTMLVideoElement | null>(null);
  let shell = $state<HTMLElement | null>(null);
  let fullscreen = $state(false);

  const track = $derived(voice.watching ? voice.screens[voice.watching] : null);
  const name = $derived(
    voice.participants.find((p) => p.identity === voice.watching)?.name ?? "someone",
  );

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
