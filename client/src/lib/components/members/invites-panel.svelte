<script lang="ts">
  import { api, type Invite } from "$lib/api";
  import { attempt } from "$lib/forms";
  import { inviteLink } from "$lib/invite";
  import { cn } from "$lib/utils";
  import { Badge } from "&/badge";
  import { Button } from "&/button";
  import { Label } from "&/label";
  import CheckIcon from "@lucide/svelte/icons/check";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import Link2Icon from "@lucide/svelte/icons/link-2";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import { onMount } from "svelte";

  let invites = $state<Invite[]>([]);
  let busy = $state(false);
  let copied = $state("");

  const presets = [
    {
      label: "One person",
      hint: "single use, 7 days",
      maxUses: 1,
      expiresInHours: 24 * 7,
    },
    {
      label: "A few",
      hint: "10 uses, 48 hours",
      maxUses: 10,
      expiresInHours: 48,
    },
    {
      label: "Open link",
      hint: "unlimited, never expires",
      maxUses: 0,
      expiresInHours: 0,
    },
  ];

  onMount(load);

  async function load() {
    const res = await attempt(() => api.invites.list(), {
      error: "failed to load invites",
    });
    if (res) invites = res.invites;
  }

  async function create(p: (typeof presets)[number]) {
    busy = true;
    await attempt(
      async () => {
        const { invite } = await api.invites.create({
          maxUses: p.maxUses,
          expiresInHours: p.expiresInHours,
        });
        invites = [invite, ...invites];
        await copy(invite.code);
      },
      {
        error: "failed to create invite",
        success: "Invite link copied to your clipboard.",
      },
    );
    busy = false;
  }

  async function revoke(code: string) {
    await attempt(
      async () => {
        const { invite } = await api.invites.revoke(code);
        invites = invites.map((i) => (i.code === code ? invite : i));
      },
      {
        error: "failed to revoke",
        success: "Invite revoked. That link no longer works.",
      },
    );
  }

  async function copy(code: string) {
    await navigator.clipboard.writeText(inviteLink(code));
    copied = code;
    setTimeout(() => (copied = ""), 1500);
  }

  function usesLabel(i: Invite) {
    return i.maxUses === 0 ? `${i.uses} joined` : `${i.uses}/${i.maxUses} used`;
  }

  function expiryLabel(i: Invite) {
    if (i.expiresAt === null) return "never expires";
    const ms = i.expiresAt - Date.now();
    if (ms <= 0) return "expired";
    const hours = Math.round(ms / 3600_000);
    return hours < 48 ? `${hours}h left` : `${Math.round(hours / 24)}d left`;
  }
</script>

<div class="flex min-h-0 flex-1 flex-col">
  <div class="space-y-2 pb-4">
    <Label>New invite</Label>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {#each presets as p (p.label)}
        <Button
          variant="outline"
          class="h-auto flex-col items-start gap-0.5 px-3 py-2 text-left"
          disabled={busy}
          onclick={() => create(p)}
        >
          <span class="text-sm font-medium">{p.label}</span>
          <span class="text-muted-foreground text-[10px] leading-tight">{p.hint}</span>
        </Button>
      {/each}
    </div>
    <p class="text-muted-foreground text-xs">
      The link is copied to your clipboard automatically.
    </p>
  </div>

  <div class="min-h-0 flex-1 space-y-2 overflow-y-auto">
    {#each invites as i (i.code)}
      <div class={cn("rounded-lg border p-3", !i.active && "opacity-50")}>
        <div class="flex items-center gap-2">
          <Link2Icon class="text-muted-foreground size-4 shrink-0" />
          <code class="min-w-0 flex-1 truncate font-mono text-xs"
            >{inviteLink(i.code)}</code
          >
          <Button
            variant="ghost"
            size="icon"
            class="size-7 shrink-0"
            title="Copy link"
            onclick={() => copy(i.code)}
          >
            {#if copied === i.code}
              <CheckIcon class="size-4 text-emerald-500" />
            {:else}
              <CopyIcon class="size-4" />
            {/if}
          </Button>
          {#if i.active}
            <Button
              variant="ghost"
              size="icon"
              class="text-destructive size-7 shrink-0"
              title="Revoke"
              onclick={() => revoke(i.code)}
            >
              <Trash2Icon class="size-4" />
            </Button>
          {/if}
        </div>
        <div class="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant={i.active ? "secondary" : "outline"} class="h-5"
            >{i.status}</Badge
          >
          <span>{usesLabel(i)}</span>
          <span>·</span>
          <span>{expiryLabel(i)}</span>
          <span class="ml-auto">by {i.createdBy}</span>
        </div>
      </div>
    {:else}
      <p class="text-muted-foreground py-8 text-center text-sm">
        No invites yet. Create one above.
      </p>
    {/each}
  </div>
</div>
