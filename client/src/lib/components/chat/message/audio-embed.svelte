<script lang="ts">
  import { attachmentUrl, type MessageAttachment } from "$lib/api";
  import { formatBytes, formatTimecode } from "$lib/format";
  import { cn } from "$lib/utils";
  import { Button } from "&/button";
  import DownloadIcon from "@lucide/svelte/icons/download";
  import PauseIcon from "@lucide/svelte/icons/pause";
  import PlayIcon from "@lucide/svelte/icons/play";
  import Volume2Icon from "@lucide/svelte/icons/volume-2";
  import VolumeXIcon from "@lucide/svelte/icons/volume-x";

  interface Props {
    attachment: MessageAttachment;
    /** Drops the download control - used in the composer preview, where the file
     *  hasn't been sent yet so downloading it back is pointless. */
    compact?: boolean;
  }
  const { attachment, compact = false }: Props = $props();

  let el = $state<HTMLAudioElement | null>(null);
  let paused = $state(true);
  let muted = $state(false);
  let duration = $state(0);
  let currentTime = $state(0);

  // While the user drags the seek bar we hold the intended position locally so the
  // fill tracks the pointer smoothly and doesn't snap back to the element's
  // (lagging) currentTime between pointermove events. Committed on release.
  let scrubbing = $state(false);
  let seek = $state(0);

  const total = $derived(Number.isFinite(duration) && duration > 0 ? duration : 0);
  const position = $derived(scrubbing ? seek : currentTime);
  const fraction = $derived(total > 0 ? Math.min(1, position / total) : 0);

  function toggle() {
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  }

  function positionFromPointer(e: PointerEvent, track: HTMLElement) {
    const rect = track.getBoundingClientRect();
    const x = Math.min(rect.right, Math.max(rect.left, e.clientX));
    return rect.width > 0 ? ((x - rect.left) / rect.width) * total : 0;
  }

  function onScrubStart(e: PointerEvent) {
    if (!total) return;
    scrubbing = true;
    seek = positionFromPointer(e, e.currentTarget as HTMLElement);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onScrubMove(e: PointerEvent) {
    if (!scrubbing) return;
    seek = positionFromPointer(e, e.currentTarget as HTMLElement);
  }
  function onScrubEnd() {
    if (!scrubbing) return;
    scrubbing = false;
    if (el) el.currentTime = seek;
    currentTime = seek;
  }

  // Arrow keys nudge by 5s, Home/End jump to the ends.
  function onKey(e: KeyboardEvent) {
    if (!el || !total) return;
    const step = 5;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = currentTime + step;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = currentTime - step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = total;
    if (next === null) return;
    e.preventDefault();
    el.currentTime = Math.min(total, Math.max(0, next));
  }
</script>

<div class="bg-muted/40 flex max-w-sm items-center gap-3 rounded-xl border px-3 py-2">
  <!-- preload="metadata" fetches just enough to show the clip's length up front,
       at the cost of one range request per audio embed on render. Worth it for a
       chat timeline; revisit (lazy on view/interaction) if channels grow audio-heavy. -->
  <audio
    bind:this={el}
    bind:paused
    bind:muted
    bind:duration
    bind:currentTime
    src={attachmentUrl(attachment.id)}
    preload="metadata"
  ></audio>

  <Button
    variant="secondary"
    size="icon"
    class="size-9 shrink-0 rounded-full"
    aria-label={paused ? "Play" : "Pause"}
    onclick={toggle}
  >
    {#if paused}
      <PlayIcon class="size-4 translate-x-px" />
    {:else}
      <PauseIcon class="size-4" />
    {/if}
  </Button>

  <div class="min-w-0 flex-1">
    <div class="truncate text-sm font-medium" title={attachment.filename}>
      {attachment.filename}
    </div>

    <div class="mt-1 flex items-center gap-2">
      <div
        role="slider"
        tabindex="0"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(total)}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${formatTimecode(position)} of ${formatTimecode(total)}`}
        class="group relative h-4 flex-1 cursor-pointer touch-none"
        onpointerdown={onScrubStart}
        onpointermove={onScrubMove}
        onpointerup={onScrubEnd}
        onpointercancel={onScrubEnd}
        onkeydown={onKey}
      >
        <div
          class="bg-muted-foreground/25 absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full"
        >
          <div
            class="bg-primary h-full rounded-full"
            style={`width:${fraction * 100}%`}
          ></div>
        </div>
        <div
          class={cn(
            "bg-primary absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm transition-opacity",
            scrubbing
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
          style={`left:${fraction * 100}%`}
        ></div>
      </div>

      <span class="text-muted-foreground w-max shrink-0 text-xs tabular-nums">
        {formatTimecode(position)} / {formatTimecode(total)}
      </span>
    </div>
  </div>

  <button
    type="button"
    class="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
    aria-label={muted ? "Unmute" : "Mute"}
    title={muted ? "Unmute" : "Mute"}
    onclick={() => (muted = !muted)}
  >
    {#if muted}
      <VolumeXIcon class="size-4" />
    {:else}
      <Volume2Icon class="size-4" />
    {/if}
  </button>

  {#if !compact}
    <!-- Direct download from the API (may be a remote origin via apiBase); not a
         SvelteKit route, so resolve() does not apply. -->
    <!-- eslint-disable svelte/no-navigation-without-resolve -->
    <a
      href={attachmentUrl(attachment.id)}
      download={attachment.filename}
      class="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
      aria-label="Download"
      title={`Download · ${formatBytes(attachment.sizeBytes)}`}
    >
      <DownloadIcon class="size-4" />
    </a>
  {/if}
</div>
