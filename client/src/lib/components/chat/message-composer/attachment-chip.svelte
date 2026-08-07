<script lang="ts">
  import { attachmentUrl } from "$lib/api";
  import { formatBytes } from "$lib/format";
  import { isCompressibleImageType, isImageType } from "$lib/image";
  import { Button } from "&/button";
  import FileIcon from "@lucide/svelte/icons/file";
  import SparklesIcon from "@lucide/svelte/icons/sparkles";
  import XIcon from "@lucide/svelte/icons/x";
  import { isAudioType } from "@motus/shared";
  import AudioEmbed from "../message/audio-embed.svelte";
  import type { Pending } from "./composer.types";

  interface Props {
    item: Pending;
    /** Re-upload the image at the opposite quality (compressible images only). */
    ontoggle: () => void;
    onremove: () => void;
  }
  const { item, ontoggle, onremove }: Props = $props();
</script>

<div class="relative">
  {#if item.attachment?.image}
    <img
      src={attachmentUrl(item.attachment.id)}
      alt={item.file.name}
      class="h-20 w-20 rounded-xl border object-cover"
    />
  {:else if item.attachment && isAudioType(item.attachment.mime)}
    <AudioEmbed attachment={item.attachment} compact />
  {:else if !item.attachment && isImageType(item.file.type)}
    <div class="bg-muted/40 h-20 w-20 rounded-xl border"></div>
  {:else}
    <div
      class="bg-muted/40 flex h-20 w-44 flex-col justify-center gap-1 rounded-xl border px-3"
    >
      <div class="flex items-center gap-2">
        <FileIcon class="size-4 shrink-0" />
        <span class="truncate text-xs font-medium" title={item.file.name}>
          {item.file.name}
        </span>
      </div>
      <span class="text-muted-foreground text-[10px]">
        {formatBytes(item.file.size)}
      </span>
    </div>
  {/if}

  {#if !item.attachment}
    <div class="bg-background/50 absolute inset-0 flex items-end rounded-xl">
      <div class="bg-muted mx-1.5 mb-1.5 h-1 flex-1 overflow-hidden rounded-full">
        <div
          class="bg-primary h-full rounded-full transition-[width] duration-150"
          style="width:{Math.round(item.progress * 100)}%"
        ></div>
      </div>
    </div>
  {/if}

  {#if isCompressibleImageType(item.file.type)}
    <Button
      variant={item.keepOriginal ? "default" : "secondary"}
      size="icon-xs"
      class="absolute -top-1.5 -left-1.5 rounded-full"
      title={item.keepOriginal
        ? "Sending the original. Click to compress and save space"
        : "Compressed to save space. Click to send the original quality"}
      onclick={ontoggle}
    >
      <SparklesIcon class="size-3" />
    </Button>
  {/if}

  <Button
    variant="secondary"
    size="icon-xs"
    class="absolute -top-1.5 -right-1.5 rounded-full"
    title="Remove attachment"
    onclick={onremove}
  >
    <XIcon class="size-3" />
  </Button>
</div>
