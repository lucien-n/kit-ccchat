<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { attachmentUrl, type MessageAttachment } from "$lib/api";
  import { formatBytes, formatRelative } from "$lib/format";
  import DownloadIcon from "@lucide/svelte/icons/download";

  interface Props {
    attachment: MessageAttachment;
  }
  const { attachment }: Props = $props();

  let root = $state<HTMLElement | null>(null);
  let visible = $state(false);

  $effect(() => {
    if (!root || visible) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          visible = true;
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(root);
    return () => io.disconnect();
  });

  const src = $derived(visible ? attachmentUrl(attachment.id) : undefined);
</script>

<figure class="bg-muted/40 max-w-md overflow-hidden rounded-xl border">
  <div bind:this={root} class="aspect-video bg-black">
    <video
      {src}
      preload="metadata"
      controls
      playsinline
      class="h-full w-full object-contain"
    >
      <track kind="captions" />
    </video>
  </div>

  <figcaption class="flex items-center gap-2 px-3 py-2">
    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-medium" title={attachment.filename}>
        {attachment.filename}
      </div>
      <div class="text-muted-foreground text-xs">
        {formatBytes(attachment.sizeBytes)}
        {#if attachment.expiresAt}
          {m.video_expires({ when: formatRelative(attachment.expiresAt) })}
        {/if}
      </div>
    </div>

    <!-- Direct download from the API (may be a remote origin via apiBase); not a
         SvelteKit route, so resolve() does not apply. -->
    <!-- eslint-disable svelte/no-navigation-without-resolve -->
    <a
      href={attachmentUrl(attachment.id)}
      download={attachment.filename}
      class="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
      aria-label={m.common_download()}
      title={m.common_download()}
    >
      <DownloadIcon class="size-4" />
    </a>
  </figcaption>
</figure>
