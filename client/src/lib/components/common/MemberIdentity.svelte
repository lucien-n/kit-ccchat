<script lang="ts">
  import { avatarUrl, type Member } from "$lib/api";
  import UserAvatar from "$lib/components/common/UserAvatar.svelte";
  import { rankLabel } from "$lib/members";
  import type { Snippet } from "svelte";

  interface Props {
    member: Member;
    showMemberRank?: boolean;
    children?: Snippet;
  }
  let { member, showMemberRank = false, children }: Props = $props();

  const showRank = $derived(member.isOwner || member.isAdmin || showMemberRank);
</script>

<UserAvatar
  src={avatarUrl(member.id, member.avatarVersion)}
  name={member.displayName}
  class="size-7"
  fallbackClass="text-xs"
/>
<div class="flex min-w-0 flex-1 items-center gap-1.5">
  <span
    class="truncate text-sm font-medium"
    style={member.color ? `color:${member.color}` : undefined}
  >
    {member.displayName}
  </span>
  {#if showRank}
    <span class="text-muted-foreground text-[10px] uppercase">{rankLabel(member)}</span>
  {/if}
</div>
{@render children?.()}
