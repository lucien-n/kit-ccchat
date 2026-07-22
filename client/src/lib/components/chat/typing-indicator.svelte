<script lang="ts">
  import { members } from "$lib/stores/members.svelte";
  import { typing } from "$lib/stores/typing.svelte";
  import { typingLabel } from "$lib/typing";
  import { fade } from "svelte/transition";

  interface Props {
    channelId: string | null;
  }

  let { channelId }: Props = $props();

  const names = $derived(
    channelId
      ? typing
          .inChannel(channelId)
          .map((id) => members.byId(id)?.displayName)
          .filter((name) => name !== undefined)
      : [],
  );
</script>

{#key names.sort().join(",")}
  <div
    transition:fade={{ duration: 50 }}
    class="text-foreground pointer-events-none absolute -top-5 left-3 max-w-[65%] truncate text-xs transition-all ease-in-out sm:left-5"
  >
    {typingLabel(names)}
  </div>
{/key}
