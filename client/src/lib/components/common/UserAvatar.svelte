<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar";
  import { cn, getInitials } from "$lib/utils";

  interface Props {
    src?: string | null;
    name: string | undefined;
    class?: string;
    fallbackClass?: string;
  }

  let { src = null, name, class: className, fallbackClass }: Props = $props();
</script>

<Avatar.Root class={className}>
  {#if src}<Avatar.Image {src} alt="" />{/if}
  <Avatar.Fallback class={cn("bg-primary text-primary-foreground", fallbackClass)}>
    {getInitials(name)}
  </Avatar.Fallback>
</Avatar.Root>
