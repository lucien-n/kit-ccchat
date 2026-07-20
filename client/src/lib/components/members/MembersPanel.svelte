<script lang="ts">
  import MemberIdentity from "$lib/components/common/MemberIdentity.svelte";
  import { UserCard } from "$lib/components/common/UserCard";
  import { byRank } from "$lib/members";
  import { members } from "$lib/stores/members.svelte";
  import { onMount } from "svelte";

  const shownMembers = $derived([...members.list].sort(byRank));

  onMount(() => members.load());
</script>

<div class="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
  {#each shownMembers as member (member.id)}
    <div class="hover:bg-muted/50 flex items-center gap-2 rounded-2xl p-2">
      <UserCard userId={member.id} class="flex min-w-0 flex-1 items-center gap-2">
        <MemberIdentity {member} />
      </UserCard>
    </div>
  {:else}
    <p class="text-muted-foreground p-4 text-center text-sm">No members yet</p>
  {/each}
</div>
