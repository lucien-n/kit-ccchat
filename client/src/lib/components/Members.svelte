<script lang="ts">
  import { api, avatarUrl, type MemberView } from "$lib/api";
  import { presence } from "$lib/stores/presence.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Sheet from "$lib/components/ui/sheet";
  import { cn } from "$lib/utils";
  import { Input } from "./ui/input";
  import UserAvatar from "./UserAvatar.svelte";
  import { Role } from "@ccchat/shared";
  import { toast } from "svelte-sonner";
  import { apiErrorMessage } from "$lib/forms";

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let search = $state("");

  let members = $state<MemberView[]>([]);

  const shownMembers = $derived.by(() => {
    const q = search.trim().toLowerCase();

    return members.filter(
      (m) =>
        m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q),
    );
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
      <Input placeholder="Search members" bind:value={search} class="my-2" />

      {#if shownMembers.length}
        {#each shownMembers as m (m.id)}
          {@const av = avatarUrl(m.id, m.avatarVersion)}
          <div class="hover:bg-muted/50 rounded-md p-2">
            <div class="flex items-center gap-2">
              <span
                class={cn(
                  "bg-muted-foreground size-2 shrink-0 rounded-full",
                  presence.online.has(m.id) && "bg-green-500",
                )}
              ></span>
              <UserAvatar
                src={av}
                name={m.displayName}
                class="size-7"
                fallbackClass="text-xs"
              />
              <div class="flex min-w-0 flex-1 items-center gap-1.5">
                <span class="truncate text-sm font-medium">{m.displayName}</span>
                <span class="text-muted-foreground text-[10px] uppercase">{m.role}</span>
              </div>
              {#if m.banned}<Badge variant="destructive">banned</Badge>{/if}
              {#if isMuted(m)}<Badge variant="secondary">muted</Badge>{/if}
            </div>

            {#if m.id !== session.user?.id && m.role !== Role.Owner}
              <div class="flex flex-wrap gap-1 pt-2 pl-9">
                {#if isMuted(m)}
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7"
                    onclick={() => act(m.id, "unmute")}>unmute</Button
                  >
                {:else}
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7"
                    onclick={() => act(m.id, "mute")}>mute</Button
                  >
                {/if}
                <Button
                  variant="outline"
                  size="sm"
                  class="h-7"
                  onclick={() => act(m.id, "kick")}>kick</Button
                >
                {#if m.banned}
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-7"
                    onclick={() => act(m.id, "unban")}>unban</Button
                  >
                {:else}
                  <Button
                    variant="destructive"
                    size="sm"
                    class="h-7"
                    onclick={() => act(m.id, "ban")}>ban</Button
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
