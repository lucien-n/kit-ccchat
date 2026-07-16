<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { onMount } from "svelte";

  onMount(() => {
    const code = page.params.code ?? "";
    void goto(`/?invite=${encodeURIComponent(code)}`, { replaceState: true });
  });
</script>

<div class="text-muted-foreground grid min-h-dvh place-items-center">
  Opening your invite…
</div>
