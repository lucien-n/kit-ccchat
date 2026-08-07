<script lang="ts">
  import { attachmentUrl, type MessageAttachment } from "$lib/api";
  import { fly, scale } from "$lib/motion";
  import { m } from "$lib/paraglide/messages";
  import { cn } from "$lib/utils";
  import { Button } from "&/button";
  import * as Dialog from "&/dialog";
  import { Separator } from "&/separator";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import DownloadIcon from "@lucide/svelte/icons/download";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import XIcon from "@lucide/svelte/icons/x";
  import ZoomInIcon from "@lucide/svelte/icons/zoom-in";
  import ZoomOutIcon from "@lucide/svelte/icons/zoom-out";
  import { MAX_ATTACHMENTS_PER_MESSAGE } from "@motus/shared";
  import { elasticInOut } from "svelte/easing";

  interface Props {
    images: MessageAttachment[];
  }
  const { images }: Props = $props();

  const MAX_THUMB_W = 360;
  const MAX_THUMB_H = 320;
  function thumbSize(w: number | null, h: number | null) {
    if (!w || !h) return null;
    const scale = Math.min(1, MAX_THUMB_W / w, MAX_THUMB_H / h);
    return { w: Math.round(w * scale), h: Math.round(h * scale) };
  }

  let zoomed = $state<MessageAttachment | null>(null);
  // Whether the open image is blown up (drag to pan) vs fit-to-screen.
  let scaled = $state(false);
  // The fitted image's on-screen size, measured live so zoom scales relative to
  // what's shown rather than the file's pixels - our images are downscaled, so
  // "actual size" would be a no-op zoom for anything that already fits.
  let fitW = $state(0);
  let fitH = $state(0);
  const ZOOM = 2;

  // Pan offset (px) of the enlarged image; the stage clips the overflow so the
  // image stays centred until dragged, and can't be dragged past its own edges.
  let panX = $state(0);
  let panY = $state(0);
  let panning = $state(false);
  let drag = { x: 0, y: 0, baseX: 0, baseY: 0, moved: false, pointer: -1 };

  function setZoom(on: boolean) {
    scaled = on;
    panX = 0;
    panY = 0;
  }

  function clampPan() {
    const maxX = Math.max(0, (fitW * ZOOM - window.innerWidth) / 2);
    const maxY = Math.max(0, (fitH * ZOOM - window.innerHeight) / 2);
    panX = Math.min(maxX, Math.max(-maxX, panX));
    panY = Math.min(maxY, Math.max(-maxY, panY));
  }

  function onPanStart(e: PointerEvent) {
    drag = {
      x: e.clientX,
      y: e.clientY,
      baseX: panX,
      baseY: panY,
      moved: false,
      pointer: e.pointerId,
    };
    panning = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPanMove(e: PointerEvent) {
    if (drag.pointer !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    panX = drag.baseX + dx;
    panY = drag.baseY + dy;
    clampPan();
  }

  function onPanEnd(e: PointerEvent) {
    if (drag.pointer !== e.pointerId) return;
    drag.pointer = -1;
    panning = false;
  }

  // A genuine click (not the tail of a drag) zooms back out.
  function onZoomedClick() {
    if (drag.moved) drag.moved = false;
    else setZoom(false);
  }

  // Single entry point for changing the shown image so zoom always resets with it.
  function show(image: MessageAttachment | null) {
    zoomed = image;
    setZoom(false);
  }

  // Step to the neighbouring image, wrapping at either end.
  function stepZoom(dir: 1 | -1) {
    if (!zoomed) return;
    const index = images.findIndex((img) => img.id === zoomed?.id);
    if (index < 0) return;
    show(images[(index + dir + images.length) % images.length]);
  }

  // Force a download even though images are served inline; a programmatic anchor
  // keeps the template free of the navigation-without-resolve lint an <a> trips.
  function saveImage() {
    if (!zoomed) return;
    const a = document.createElement("a");
    a.href = attachmentUrl(zoomed.id);
    a.download = zoomed.filename;
    a.rel = "noopener";
    a.click();
  }

  function openInBrowser() {
    if (zoomed) window.open(attachmentUrl(zoomed.id), "_blank", "noopener,noreferrer");
  }

  const CONTROLS: { [key: string]: () => void } = {
    ArrowRight: () => stepZoom(1),
    ArrowLeft: () => stepZoom(-1),
  };
</script>

<div
  class={cn(
    "mt-1 flex flex-wrap gap-2",
    images.length === MAX_ATTACHMENTS_PER_MESSAGE
      ? "grid grid-cols-6"
      : images.length >= 8
        ? "grid grid-cols-4"
        : images.length >= 5
          ? "grid grid-cols-3"
          : images.length >= 3 && "grid grid-cols-2",
  )}
>
  {#each images as image (image.id)}
    {@const dim = thumbSize(image.width, image.height)}
    <button
      type="button"
      class="bg-muted/40 max-w-full cursor-zoom-in overflow-hidden rounded-xl border"
      style={dim ? `width:${dim.w}px;height:${dim.h}px` : undefined}
      onclick={() => show(image)}
    >
      <img
        src={attachmentUrl(image.id)}
        alt={image.filename}
        width={image.width}
        height={image.height}
        loading="lazy"
        class={dim ? "h-full w-full object-cover" : "max-h-80 w-auto max-w-full"}
      />
    </button>
  {/each}
</div>

{#if zoomed}
  <Dialog.Root open onOpenChange={() => show(null)}>
    <Dialog.Content
      class="fixed inset-0 z-50 flex h-dvh max-h-none w-dvw max-w-none translate-x-0 translate-y-0 items-center justify-center gap-0 overflow-hidden rounded-none bg-black/80 p-0 shadow-none ring-0 sm:max-w-none"
      showCloseButton={false}
      onkeydown={(ev) => CONTROLS[ev.key]?.()}
    >
      <Dialog.Title class="sr-only">{zoomed.filename}</Dialog.Title>

      {#if scaled}
        <!-- Enlarged past the fitted size: drag to pan, overflow clipped, click to
             zoom out. Stays centred until dragged. -->
        <div class="absolute inset-0 flex items-center justify-center overflow-hidden">
          <button
            type="button"
            aria-label={m.gallery_zoom_out()}
            class={cn("touch-none", panning ? "cursor-grabbing" : "cursor-zoom-out")}
            style={`transform:translate(${panX}px,${panY}px)`}
            onpointerdown={onPanStart}
            onpointermove={onPanMove}
            onpointerup={onPanEnd}
            onpointercancel={onPanEnd}
            onclick={onZoomedClick}
          >
            <img
              src={attachmentUrl(zoomed.id)}
              alt={zoomed.filename}
              draggable="false"
              class="max-w-none rounded-xl select-none"
              style={fitW && fitH
                ? `width:${Math.round(fitW * ZOOM)}px;height:${Math.round(fitH * ZOOM)}px`
                : undefined}
            />
          </button>
        </div>
      {:else}
        <button
          type="button"
          aria-label={m.common_close()}
          class="absolute inset-0 cursor-default"
          onclick={() => show(null)}
        ></button>
        <button
          type="button"
          aria-label={m.gallery_zoom_in()}
          class="relative z-10"
          onclick={() => setZoom(true)}
        >
          <img
            bind:clientWidth={fitW}
            bind:clientHeight={fitH}
            src={attachmentUrl(zoomed.id)}
            alt={zoomed.filename}
            class="max-h-[90dvh] max-w-[92vw] cursor-zoom-in rounded-xl object-contain"
          />
        </button>
      {/if}

      <div
        class="bg-popover absolute top-4 right-4 z-20 flex items-center gap-1 rounded-2xl border p-0.5"
        transition:scale={{ duration: 75 }}
      >
        <Button
          variant="ghost"
          size="icon"
          title={scaled ? m.gallery_zoom_out() : m.gallery_zoom_in()}
          onclick={() => setZoom(!scaled)}
        >
          {#if scaled}
            <ZoomOutIcon class="size-4" />
          {:else}
            <ZoomInIcon class="size-4" />
          {/if}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={m.gallery_save_image()}
          onclick={saveImage}
        >
          <DownloadIcon class="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title={m.gallery_open_in_browser()}
          onclick={openInBrowser}
        >
          <ExternalLinkIcon class="size-4" />
        </Button>

        <div class="flex h-full py-1">
          <Separator orientation="vertical" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          title={m.common_close()}
          onclick={() => show(null)}
        >
          <XIcon class="size-5" />
        </Button>
      </div>

      {#if images.length > 1}
        <Button
          variant="secondary"
          size="icon"
          title={m.common_previous()}
          class="absolute left-4 z-20 my-auto"
          onclick={() => stepZoom(-1)}
        >
          <ChevronLeftIcon class="size-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          title={m.common_next()}
          class="absolute right-4 z-20 my-auto"
          onclick={() => stepZoom(1)}
        >
          <ChevronRightIcon class="size-5" />
        </Button>

        <div
          class="absolute bottom-4 left-1/2 z-20 flex max-w-[92vw] -translate-x-1/2 items-center gap-1 overflow-x-auto"
          transition:scale={{ duration: 75 }}
        >
          {#each images as image (image.id)}
            {@const isCurrent = zoomed.id === image.id}
            <div transition:fly={{ y: 30, duration: 50, easing: elasticInOut }}>
              <button
                type="button"
                aria-label={image.filename}
                class={cn(
                  "size-14 shrink-0 overflow-hidden rounded-md border-2 transition-all",
                  isCurrent
                    ? "border-primary"
                    : "border-transparent opacity-60 hover:opacity-100",
                )}
                onclick={() => show(image)}
              >
                <img
                  src={attachmentUrl(image.id)}
                  alt={image.filename}
                  class="size-full object-cover"
                />
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </Dialog.Content>
  </Dialog.Root>
{/if}
