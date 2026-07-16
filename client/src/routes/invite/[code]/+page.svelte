<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { onMount } from "svelte";

  // replaceState keeps this out of history, so Back doesn't bounce the user
  // through here again.
  onMount(() => {
    const code = page.params.code ?? "";
    void goto(resolve(`/?invite=${encodeURIComponent(code)}`), {
      replaceState: true,
    });
  });
</script>

<div class="text-muted-foreground grid min-h-dvh place-items-center">
  Opening your invite…
</div>
