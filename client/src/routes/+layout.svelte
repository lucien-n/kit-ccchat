<script lang="ts">
  import ExternalLinkDialog from "$lib/components/common/external-link-dialog.svelte";
  import { Toaster } from "&/sonner";
  import "../app.css";

  let { children } = $props();
</script>

{@render children()}

<ExternalLinkDialog />
<Toaster richColors closeButton position="bottom-right" />
