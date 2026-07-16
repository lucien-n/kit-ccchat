<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';

  // replaceState keeps this out of history, so Back doesn't bounce the user
  // through here again.
  onMount(() => {
    const code = page.params.code ?? '';
    void goto(`/?invite=${encodeURIComponent(code)}`, { replaceState: true });
  });
</script>

<div class="text-muted-foreground grid min-h-dvh place-items-center">Opening your invite…</div>
