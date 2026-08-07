<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { ModAction } from "$lib/api";
  import MemberIdentity from "$lib/components/common/member-identity.svelte";
  import { attempt } from "$lib/forms";
  import { byRank, isMuted } from "$lib/members";
  import { members, presence, session } from "$lib/stores";
  import { Badge } from "&/badge";
  import { Button } from "&/button";
  import { Checkbox } from "&/checkbox";
  import { Input } from "&/input";
  import { Label } from "&/label";
  import { onMount } from "svelte";

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

  async function act(id: string, action: ModAction) {
    await attempt(
      () =>
        members.moderate(
          id,
          action,
          action === ModAction.Mute ? { minutes: 60 } : undefined,
        ),
      { error: m.moderation_action_failed() },
    );
  }

  onMount(() => members.load());
</script>

<div class="flex min-h-0 flex-1 flex-col">
  <div class="flex flex-wrap gap-2 pb-2">
    <Input
      placeholder={m.members_search_placeholder()}
      bind:value={search}
      class="min-w-40 flex-1"
    />

    <section class="flex items-center gap-1">
      <Checkbox id="cb-mod-only-active" bind:checked={showOnlyActiveMembers} />
      <Label for="cb-mod-only-active">{m.moderation_only_active()}</Label>
    </section>
  </div>

  <div class="min-h-0 flex-1 space-y-1 overflow-y-auto">
    {#if shownMembers.length}
      {#each shownMembers as member (member.id)}
        <div
          class="hover:bg-muted/50 flex items-center justify-between gap-2 rounded-2xl p-2"
        >
          <MemberIdentity {member} showMemberRank>
            {#if member.banned}<Badge variant="destructive">{m.status_banned()}</Badge>{/if}
            {#if isMuted(member)}<Badge variant="secondary">{m.status_muted()}</Badge>{/if}
          </MemberIdentity>

          {#if member.id !== session.user?.id && !member.isOwner}
            <div class="flex flex-wrap gap-1 pt-2 pl-9">
              {#if isMuted(member)}
                <Button
                  variant="outline"
                  size="sm"
                  class="h-7"
                  onclick={() => act(member.id, ModAction.Unmute)}
                  >{m.moderation_unmute()}</Button
                >
              {:else}
                <Button
                  variant="outline"
                  size="sm"
                  class="h-7"
                  onclick={() => act(member.id, ModAction.Mute)}
                  >{m.moderation_mute()}</Button
                >
              {/if}
              <Button
                variant="outline"
                size="sm"
                class="h-7"
                onclick={() => act(member.id, ModAction.Kick)}
                >{m.moderation_kick()}</Button
              >
              {#if member.banned}
                <Button
                  variant="outline"
                  size="sm"
                  class="h-7"
                  onclick={() => act(member.id, ModAction.Unban)}
                  >{m.moderation_unban()}</Button
                >
              {:else}
                <Button
                  variant="destructive"
                  size="sm"
                  class="h-7"
                  onclick={() => act(member.id, ModAction.Ban)}
                  >{m.moderation_ban()}</Button
                >
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    {:else}
      <p class="text-muted-foreground text-center">{m.members_none_found()}</p>
    {/if}
  </div>
</div>
