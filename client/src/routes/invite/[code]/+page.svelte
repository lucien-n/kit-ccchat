<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';

  // The shareable half of an invite link. It holds no logic of its own: it hands
  // the code to the main page and gets out of the way, so there is exactly one
  // place that knows how to redeem one. replaceState keeps this out of history,
  // so Back doesn't bounce the user through here again.
  onMount(() => {
    const code = page.params.code ?? '';
    void goto(`/?invite=${encodeURIComponent(code)}`, { replaceState: true });
  });
</script>

<div class="text-muted-foreground grid min-h-dvh place-items-center">Opening your invite…</div>
