<script lang="ts">
  import { api, avatarUrl, type MemberView } from "$lib/api";
  import UserAvatar from "$lib/components/common/UserAvatar.svelte";
  import { apiErrorMessage } from "$lib/forms";
  import { presence } from "$lib/stores/presence.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { cn } from "$lib/utils";
  import { rankOf } from "@ccchat/shared";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";

  let members = $state<MemberView[]>([]);

  const roster = $derived(
    [...members]
      .filter((m) => !m.banned)
      .sort((a, b) => {
        const diff = rankOf(b.role) - rankOf(a.role);
        return diff !== 0 ? diff : a.displayName.localeCompare(b.displayName);
      }),
  );

  async function load() {
    if (!session.token) return;
    try {
      members = (await api.members(session.token)).members;
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to load members"));
    }
  }

  onMount(load);
</script>

<div class="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
  {#each roster as member (member.id)}
    {@const av = avatarUrl(member.id, member.avatarVersion)}
    <div class="hover:bg-muted/50 flex items-center gap-2 rounded-md p-2">
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
        <span class="text-muted-foreground text-[10px] uppercase">{member.role}</span>
      </div>
    </div>
  {:else}
    <p class="text-muted-foreground p-4 text-center text-sm">No members yet</p>
  {/each}
</div>
