<script lang="ts">
  import { attachmentUrl, type MessageAttachment } from "$lib/api";
  import { formatBytes, formatRelative } from "$lib/format";
  import DownloadIcon from "@lucide/svelte/icons/download";
  import FileIcon from "@lucide/svelte/icons/file";

  interface Props {
    attachment: MessageAttachment;
  }
  const { attachment }: Props = $props();
</script>

<!-- Direct download from the API (may be a remote origin via apiBase); not a
     SvelteKit route, so resolve() does not apply. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
  href={attachmentUrl(attachment.id)}
  download={attachment.filename}
  class="bg-muted/40 hover:bg-muted/70 flex max-w-sm items-center gap-3 rounded-xl border px-3 py-2 transition-colors"
>
  <FileIcon class="text-muted-foreground size-5 shrink-0" />
  <div class="min-w-0 flex-1">
    <div class="truncate text-sm font-medium" title={attachment.filename}>
      {attachment.filename}
    </div>
    <div class="text-muted-foreground text-xs">
      {formatBytes(attachment.sizeBytes)}
      {#if attachment.expiresAt}
        &middot; expires {formatRelative(attachment.expiresAt)}
      {/if}
    </div>
  </div>
  <DownloadIcon class="text-muted-foreground size-4 shrink-0" />
</a>
