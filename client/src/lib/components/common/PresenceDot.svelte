<script lang="ts">
  import { presence } from "$lib/stores/presence.svelte";
  import { cn } from "$lib/utils";

  interface Props {
    userId: string;
    class?: string;
  }
  let { userId, class: className }: Props = $props();
</script>

<span
  class={cn(
    "bg-muted-foreground size-2 shrink-0 rounded-full",
    presence.online.has(userId) && "bg-green-500",
    className,
  )}
></span>
