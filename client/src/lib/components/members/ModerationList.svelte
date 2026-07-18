<script lang="ts">
  import { api, type ModeratedMember } from "$lib/api";
  import MemberIdentity from "$lib/components/common/MemberIdentity.svelte";
  import PresenceDot from "$lib/components/common/PresenceDot.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { apiErrorMessage } from "$lib/forms";
  import { byRank } from "$lib/members";
  import { members } from "$lib/stores/members.svelte";
  import { presence } from "$lib/stores/presence.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";

  let search = $state("");
  let showOnlyActiveMembers = $state(false);

  const shownMembers = $derived.by(() => {
    const q = search.trim().toLowerCase();
    return members.list
      .filter((m) => !(showOnlyActiveMembers && !presence.isOnline(m.id)))
      .filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q),
      )
      .sort(byRank);
  });

  async function act(id: string, action: "kick" | "ban" | "unban" | "mute" | "unmute") {
    if (!session.token) return;
    try {
      const body = action === "mute" ? { minutes: 60 } : undefined;
      await api.mod(session.token, id, action, body);
      await members.load(true);
    } catch (e) {
      toast.error(apiErrorMessage(e, "action failed"));
    }
  }

  const isMuted = (m: ModeratedMember) =>
    m.mutedUntil != null && m.mutedUntil > Date.now();

  onMount(() => members.load());
</script>

<div class="flex min-h-0 flex-1 flex-col">
  <div class="flex gap-2 pb-2">
    <Input placeholder="Search members" bind:value={search} class="flex-1" />

    <section class="flex items-center gap-1">
      <Checkbox id="cb-mod-only-active" bind:checked={showOnlyActiveMembers} />
      <Label for="cb-mod-only-active">Only active</Label>
    </section>
  </div>

  <div class="min-h-0 flex-1 space-y-1 overflow-y-auto">
    {#if shownMembers.length}
      {#each shownMembers as member (member.id)}
        <div class="hover:bg-muted/50 rounded-md p-2">
          <div class="flex items-center gap-2">
            <PresenceDot userId={member.id} />
            <MemberIdentity {member} showMemberRank>
              {#if member.banned}<Badge variant="destructive">banned</Badge>{/if}
              {#if isMuted(member)}<Badge variant="secondary">muted</Badge>{/if}
            </MemberIdentity>
          </div>

          {#if member.id !== session.user?.id && !member.isOwner}
            <div class="flex flex-wrap gap-1 pt-2 pl-9">
              {#if isMuted(member)}
                <Button
                  variant="outline"
                  size="sm"
                  class="h-7"
                  onclick={() => act(member.id, "unmute")}>unmute</Button
                >
              {:else}
                <Button
                  variant="outline"
                  size="sm"
                  class="h-7"
                  onclick={() => act(member.id, "mute")}>mute</Button
                >
              {/if}
              <Button
                variant="outline"
                size="sm"
                class="h-7"
                onclick={() => act(member.id, "kick")}>kick</Button
              >
              {#if member.banned}
                <Button
                  variant="outline"
                  size="sm"
                  class="h-7"
                  onclick={() => act(member.id, "unban")}>unban</Button
                >
              {:else}
                <Button
                  variant="destructive"
                  size="sm"
                  class="h-7"
                  onclick={() => act(member.id, "ban")}>ban</Button
                >
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    {:else}
      <p class="text-muted-foreground text-center">No members found</p>
    {/if}
  </div>
</div>
