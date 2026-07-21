<script lang="ts">
  import { avatarUrl } from "$lib/api";
  import * as Avatar from "$lib/components/ui/avatar";
  import { cn, getInitials } from "$lib/utils";
  import type { Member } from "@ccchat/shared";
  import PresenceDot from "./presence-dot.svelte";

  interface Props {
    user: Pick<Member, "id" | "displayName" | "avatarVersion"> | null;
    class?: string;
    fallbackClass?: string;
    showPresenceDot?: boolean;
  }

  const { user, class: className, fallbackClass, showPresenceDot }: Props = $props();

  const src = $derived(user ? avatarUrl(user.id, user.avatarVersion) : null);
</script>

<Avatar.Root class={cn("relative", className)}>
  {#if src}<Avatar.Image {src} alt="" />{/if}
  <Avatar.Fallback class={cn("bg-primary text-primary-foreground", fallbackClass)}>
    {getInitials(user?.displayName)}
  </Avatar.Fallback>

  {#if showPresenceDot && user}
    <PresenceDot userId={user.id} class="absolute right-0 bottom-0" />
  {/if}
</Avatar.Root>
