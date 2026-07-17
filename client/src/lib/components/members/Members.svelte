<script lang="ts">
  import { api, avatarUrl, type MemberView } from "$lib/api";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import * as Sheet from "$lib/components/ui/sheet";
  import UserAvatar from "$lib/components/common/UserAvatar.svelte";
  import { apiErrorMessage } from "$lib/forms";
  import { presence } from "$lib/stores/presence.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { cn } from "$lib/utils";
  import { rankOf, Role } from "@ccchat/shared";
  import { toast } from "svelte-sonner";

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let search = $state("");
  let showOnlyActiveMembers = $state(false);

  let members = $state<MemberView[]>([]);

  const shownMembers = $derived.by(() => {
    const q = search.trim().toLowerCase();

    return members.filter((m) => {
      if (!presence.isOnline(m.id) && showOnlyActiveMembers) {
        return false;
      }

      return (
        m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q)
      );
    });
  });

  async function load() {
    if (!session.token) return;
    try {
      members = (await api.members(session.token)).members;
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to load members"));
    }
  }

  async function act(id: string, action: "kick" | "ban" | "unban" | "mute" | "unmute") {
    if (!session.token) return;
    try {
      const body = action === "mute" ? { minutes: 60 } : undefined;
      await api.mod(session.token, id, action, body);
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, "action failed"));
    }
  }

  const isMuted = (m: MemberView) => m.mutedUntil != null && m.mutedUntil > Date.now();

  $effect(() => {
    if (open) load();
  });
</script>

<Sheet.Root bind:open>
  <Sheet.Content side="right" class="flex w-80 flex-col gap-0 sm:max-w-sm">
    <Sheet.Header>
      <Sheet.Title>Members</Sheet.Title>
    </Sheet.Header>

    <div class="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
      <div class="flex gap-2">
        <Input placeholder="Search members" bind:value={search} class="my-2" />

        <section class="flex items-center gap-1">
          <Checkbox
            id="cb-show-only-active-members"
            bind:checked={showOnlyActiveMembers}
          />
          <Label for="cb-show-only-active-members">Only active</Label>
        </section>
      </div>

      {#if shownMembers.length}
        {#each shownMembers.sort((a, b) => {
          const diff = rankOf(b.role) - rankOf(a.role);

          return diff !== 0 ? diff : a.displayName.localeCompare(b.displayName);
        }) as member (member.id)}
          {@const av = avatarUrl(member.id, member.avatarVersion)}
          <div class="hover:bg-muted/50 rounded-md p-2">
            <div class="flex items-center gap-2">
              <span
                class={cn(
                  "bg-muted-foreground size-2 shrink-0 rounded-full",
                  presence.online.has(member.id) && "bg-green-500",
                )}
              ></span>
              <UserAvatar
                src={av}
                name={member.displayName}
                class="size-7"
                fallbackClass="text-xs"
              />
              <div class="flex min-w-0 flex-1 items-center gap-1.5">
                <span class="truncate text-sm font-medium">{member.displayName}</span>
                <span class="text-muted-foreground text-[10px] uppercase"
                  >{member.role}</span
                >
              </div>
              {#if member.banned}<Badge variant="destructive">banned</Badge>{/if}
              {#if isMuted(member)}<Badge variant="secondary">muted</Badge>{/if}
            </div>

            {#if member.id !== session.user?.id && member.role !== Role.Owner}
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
  </Sheet.Content>
</Sheet.Root>
