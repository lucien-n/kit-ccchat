<script lang="ts">
  import { cn } from "$lib/utils";
  import * as Popover from "&/popover";
  import type { Snippet } from "svelte";
  import UserCardActions from "./user-card-actions.svelte";
  import UserCardContent from "./user-card-content.svelte";
  import { setUserContext } from "$lib/context/user.svelte";

  interface Props {
    userId: string;
    children?: Snippet;
    anchor?: HTMLElement | null;
    open?: boolean;
    class?: string;
  }
  let {
    userId,
    children,
    anchor = null,
    open = $bindable(false),
    class: className,
  }: Props = $props();

  setUserContext(() => userId);
</script>

<UserCardActions>
  <Popover.Root bind:open>
    {#if children}
      <Popover.Trigger class={cn("cursor-pointer text-left", className)}>
        {@render children()}
      </Popover.Trigger>
    {/if}
    <Popover.Content class="w-72 p-0" align="start" customAnchor={anchor}>
      <UserCardContent {userId} onClose={() => (open = false)} />
    </Popover.Content>
  </Popover.Root>
</UserCardActions>
