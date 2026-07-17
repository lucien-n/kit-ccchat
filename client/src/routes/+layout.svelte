<script lang="ts">
  import ExternalLinkDialog from "$lib/components/common/ExternalLinkDialog.svelte";
  import { Toaster } from "$lib/components/ui/sonner";
  import "../app.css";

  let { children } = $props();
</script>

{@render children()}

<ExternalLinkDialog />
<Toaster richColors closeButton position="bottom-right" />
