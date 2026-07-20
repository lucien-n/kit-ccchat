<script lang="ts">
  import { presence } from "$lib/stores/presence.svelte";
  import { cn } from "$lib/utils";

  interface Props {
    userId: string;
    class?: string;
  }
  const { userId, class: className }: Props = $props();
</script>

<span
  class={cn(
    "bg-muted-foreground outline-background size-2 shrink-0 rounded-full outline",
    presence.online.has(userId) && "bg-green-500",
    className,
  )}
></span>
