<script lang="ts">
  import { floatingWindow } from "$lib/actions/floating-window";
  import { selectChannel } from "$lib/app";
  import { fade } from "$lib/motion";
  import { channels, voice } from "$lib/stores";
  import { cn } from "$lib/utils";
  import { Button } from "&/button";
  import Maximize2Icon from "@lucide/svelte/icons/maximize-2";
  import XIcon from "@lucide/svelte/icons/x";

  let dismissed = $state(false);
  let el = $state<HTMLVideoElement | null>(null);

  const spot = $derived(voice.spotlight);
  // The room and the full stream view already show this in the main pane, so the
  // floating window is only for when you've wandered off to another channel.
  const inMainPane = $derived(
    voice.share.watching !== null || channels.current?.id === voice.channel?.id,
  );
  const show = $derived(voice.inCall && spot !== null && !inMainPane && !dismissed);

  // A fresh call (or leaving) clears a prior dismissal so the window can return.
  $effect(() => {
    void voice.channel?.id;
    dismissed = false;
  });

  // adaptiveStream only pulls frames while attached, so swapping the spotlight
  // track (a new active speaker) detaches the old feed and mounts the new one.
  $effect(() => {
    const node = el;
    const track = spot?.track;
    if (!node || !track) return;
    track.attach(node);
    return () => {
      track.detach(node);
    };
  });

  function open() {
    const id = voice.channel?.id;
    if (id) void selectChannel(id);
  }
</script>

{#if show && spot}
  <div
    use:floatingWindow
    transition:fade={{ duration: 150 }}
    class="group bg-background fixed right-4 bottom-4 z-50 w-64 cursor-grab overflow-hidden rounded-xl border shadow-lg"
  >
    <video
      bind:this={el}
      autoplay
      muted
      playsinline
      ondblclick={open}
      class={cn(
        "aspect-video w-full bg-black",
        spot.kind === "screen" ? "object-contain" : "object-cover",
      )}
    ></video>

    <div
      class="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-1 bg-gradient-to-b from-black/60 to-transparent px-2 py-1"
    >
      <span class="min-w-0 truncate text-xs font-medium text-white">{spot.name}</span>
      <div class="pointer-events-auto flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-xs"
          class="text-white hover:bg-white/20 hover:text-white"
          title="Open voice channel"
          onclick={open}
        >
          <Maximize2Icon class="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          class="text-white hover:bg-white/20 hover:text-white"
          title="Hide"
          onclick={() => (dismissed = true)}
        >
          <XIcon class="size-3.5" />
        </Button>
      </div>
    </div>

    <div
      data-resize
      title="Drag to resize"
      class="absolute right-0.5 bottom-0.5 size-3 cursor-se-resize rounded-sm border-r-2 border-b-2 border-white/50 opacity-0 transition-opacity group-hover:opacity-100"
    ></div>
  </div>
{/if}
