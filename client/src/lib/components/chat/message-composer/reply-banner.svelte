<script lang="ts">
  import { Button } from "&/button";
  import ReplyIcon from "@lucide/svelte/icons/reply";
  import XIcon from "@lucide/svelte/icons/x";

  interface Props {
    name: string;
    oncancel: () => void;
  }
  const { name, oncancel }: Props = $props();
</script>

<div
  class="bg-muted/40 text-muted-foreground mb-2 flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs"
>
  <ReplyIcon class="size-3.5 shrink-0" />
  <span class="shrink-0">Replying to</span>
  <span class="text-foreground min-w-0 truncate font-medium">{name}</span>
  <Button
    variant="ghost"
    size="icon-xs"
    class="ml-auto shrink-0"
    title="Cancel reply"
    onclick={oncancel}
  >
    <XIcon class="size-3.5" />
  </Button>
</div>
