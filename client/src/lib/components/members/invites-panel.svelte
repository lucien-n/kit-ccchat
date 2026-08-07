<script lang="ts">
  import { m } from "$lib/paraglide/messages";
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

  const presets = $derived([
    {
      label: m.invite_preset_one_label(),
      hint: m.invite_preset_one_hint(),
      maxUses: 1,
      expiresInHours: 24 * 7,
    },
    {
      label: m.invite_preset_few_label(),
      hint: m.invite_preset_few_hint(),
      maxUses: 10,
      expiresInHours: 48,
    },
    {
      label: m.invite_preset_open_label(),
      hint: m.invite_preset_open_hint(),
      maxUses: 0,
      expiresInHours: 0,
    },
  ]);

  onMount(load);

  async function load() {
    const res = await attempt(() => api.invites.list(), {
      error: m.invite_load_failed(),
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
        error: m.invite_create_failed(),
        success: m.invite_copied_toast(),
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
        error: m.invite_revoke_failed(),
        success: m.invite_revoked_toast(),
      },
    );
  }

  async function copy(code: string) {
    await navigator.clipboard.writeText(inviteLink(code));
    copied = code;
    setTimeout(() => (copied = ""), 1500);
  }

  function usesLabel(i: Invite) {
    return i.maxUses === 0
      ? m.invite_uses_joined({ count: i.uses })
      : m.invite_uses_used({ uses: i.uses, max: i.maxUses });
  }

  function expiryLabel(i: Invite) {
    if (i.expiresAt === null) return m.invite_never_expires();
    const ms = i.expiresAt - Date.now();
    if (ms <= 0) return m.invite_expired();
    const hours = Math.round(ms / 3600_000);
    return hours < 48
      ? m.invite_hours_left({ hours })
      : m.invite_days_left({ days: Math.round(hours / 24) });
  }
</script>

<div class="flex min-h-0 flex-1 flex-col">
  <div class="space-y-2 pb-4">
    <Label>{m.invite_new()}</Label>
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
    <p class="text-muted-foreground text-xs">{m.invite_auto_copy()}</p>
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
            title={m.invite_copy_link()}
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
              title={m.invite_revoke()}
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
          <span class="ml-auto">{m.invite_created_by({ name: i.createdBy })}</span>
        </div>
      </div>
    {:else}
      <p class="text-muted-foreground py-8 text-center text-sm">{m.invite_empty()}</p>
    {/each}
  </div>
</div>
