<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import MemberIdentity from "$lib/components/common/member-identity.svelte";
  import { UserCard } from "$lib/components/common/user-card";
  import { byRank } from "$lib/members";
  import { members, presence } from "$lib/stores";
  import type { Member } from "@motus/shared";
  import { onMount } from "svelte";
  import { PresenceGroup } from ".";
  import { SvelteMap } from "svelte/reactivity";
  import { crossfade, fade, flip } from "$lib/motion";
  import { cubicOut } from "svelte/easing";
  import { cn } from "$lib/utils";

  type Row =
    | { kind: "header"; key: string; group: PresenceGroup }
    | { kind: "member"; key: string; group: PresenceGroup; member: Member };

  const shownMembers = $derived(members.list.filter((m) => !m.banned).sort(byRank));
  const membersByGroup = $derived(
    shownMembers.reduce((acc, m) => {
      const group = presence.online.has(m.id)
        ? PresenceGroup.Online
        : PresenceGroup.Offline;
      if (!acc.has(group)) {
        acc.set(group, []);
      }

      acc.get(group)?.push(m);
      return acc;
    }, new SvelteMap<PresenceGroup, Member[]>()),
  );

  const rows = $derived.by(() => {
    const out: Row[] = [];
    for (const group of [PresenceGroup.Online, PresenceGroup.Offline]) {
      const list = membersByGroup.get(group);
      if (!list?.length) continue;
      out.push({ kind: "header", key: `header:${group}`, group });
      for (const member of list)
        out.push({ kind: "member", key: member.id, group, member });
    }
    return out;
  });

  const [send, receive] = crossfade({
    duration: 200,
    easing: cubicOut,
    fallback: () => ({ duration: 200, easing: cubicOut, css: (t) => `opacity: ${t}` }),
  });

  onMount(() => members.load());
</script>

<div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
  {#each rows as row (row.key)}
    <div
      class={row.kind === "header" ? "mt-3 first:mt-0" : "mt-0.5"}
      animate:flip={{ duration: 200 }}
    >
      {#if row.kind === "header"}
        <p class="text-muted-foreground px-2 text-xs" transition:fade={{ duration: 200 }}>
          {row.group === PresenceGroup.Online
            ? m.presence_online()
            : m.presence_offline()}
        </p>
      {:else}
        <div
          class={cn(
            "hover:bg-muted/50 flex items-center gap-2 rounded-2xl p-2",
            row.group === PresenceGroup.Offline && "opacity-50",
          )}
          in:receive={{ key: row.key }}
          out:send={{ key: row.key }}
        >
          <UserCard userId={row.member.id} class="flex min-w-0 flex-1 items-center gap-2">
            <MemberIdentity member={row.member} />
          </UserCard>
        </div>
      {/if}
    </div>
  {:else}
    <p class="text-muted-foreground p-4 text-center text-sm">{m.members_empty()}</p>
  {/each}
</div>
