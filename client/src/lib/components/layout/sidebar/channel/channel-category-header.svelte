<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { session } from "$lib/stores";
  import { Button } from "&/button";
  import PlusIcon from "@lucide/svelte/icons/plus";

  interface Props {
    title: string;
    onCreate: () => void;
  }

  const { title, onCreate }: Props = $props();
</script>

<div
  class="text-muted-foreground hover:text-foreground group flex items-center justify-between px-2 pt-2 pb-1"
>
  <span class="text-xs font-semibold tracking-wide uppercase">
    {title}
  </span>
  {#if session.isAdmin}
    <Button
      variant="ghost"
      size="icon-sm"
      title={m.channel_create_category({ category: title })}
      onclick={onCreate}
    >
      <PlusIcon class="size-4" />
    </Button>
  {/if}
</div>
