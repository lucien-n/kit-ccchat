<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { DeleteSpan, ModAction } from "$lib/api";
  import ConfirmDialog from "$lib/components/common/confirm-dialog.svelte";
  import { Select } from "$lib/components/common/select";
  import { getUserContext } from "$lib/context/user.svelte";
  import * as ContextMenu from "&/context-menu";
  import BanIcon from "@lucide/svelte/icons/ban";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import LogOutIcon from "@lucide/svelte/icons/log-out";
  import Volume2Icon from "@lucide/svelte/icons/volume-2";
  import VolumeXIcon from "@lucide/svelte/icons/volume-x";
  import type { Snippet } from "svelte";

  interface Props {
    children: Snippet;
  }

  const { children }: Props = $props();

  const ctx = getUserContext();

  const MUTE_DURATIONS = $derived([
    { minutes: 5, label: m.duration_5_minutes() },
    { minutes: 60, label: m.duration_1_hour() },
    { minutes: 1440, label: m.duration_1_day() },
    { minutes: 10080, label: m.duration_1_week() },
  ]);

  const DELETE_SPANS = $derived([
    { value: DeleteSpan.None, label: m.delete_span_none() },
    { value: DeleteSpan.Hour, label: m.delete_span_hour() },
    { value: DeleteSpan.Day, label: m.delete_span_day() },
    { value: DeleteSpan.Week, label: m.delete_span_week() },
    { value: DeleteSpan.All, label: m.delete_span_all() },
  ]);

  let deleteSpan = $state<DeleteSpan>(DeleteSpan.None);
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger class="contents">
    {@render children()}
  </ContextMenu.Trigger>

  <ContextMenu.Content class="w-52 overflow-visible">
    <ContextMenu.Group>
      <ContextMenu.Item onSelect={() => ctx.copyId()}>
        <CopyIcon />
        {m.user_copy_id()}
      </ContextMenu.Item>
    </ContextMenu.Group>

    {#if ctx.showModeration}
      <ContextMenu.Separator />
      <ContextMenu.Group>
        <ContextMenu.GroupHeading>{m.moderation_heading()}</ContextMenu.GroupHeading>
        {#if ctx.muted}
          <ContextMenu.Item
            disabled={ctx.busy}
            onSelect={() => ctx.moderate(ModAction.Unmute)}
          >
            <Volume2Icon />
            {m.moderation_unmute()}
          </ContextMenu.Item>
        {:else}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger class="gap-2" disabled={ctx.busy}>
              <VolumeXIcon />
              {m.moderation_mute()}
            </ContextMenu.SubTrigger>
            <ContextMenu.SubContent class="z-100">
              {#each MUTE_DURATIONS as d (d.minutes)}
                <ContextMenu.Item
                  onSelect={() => ctx.moderate(ModAction.Mute, { minutes: d.minutes })}
                >
                  {d.label}
                </ContextMenu.Item>
              {/each}
            </ContextMenu.SubContent>
          </ContextMenu.Sub>
        {/if}
        <ContextMenu.Item
          disabled={ctx.busy}
          onSelect={() => (ctx.confirming = ModAction.Kick)}
        >
          <LogOutIcon />
          {m.moderation_kick()}
        </ContextMenu.Item>
        {#if ctx.member?.banned}
          <ContextMenu.Item
            disabled={ctx.busy}
            onSelect={() => ctx.moderate(ModAction.Unban)}
          >
            <BanIcon />
            {m.moderation_unban()}
          </ContextMenu.Item>
        {:else}
          <ContextMenu.Item
            variant="destructive"
            disabled={ctx.busy}
            onSelect={() => (ctx.confirming = ModAction.Ban)}
          >
            <BanIcon />
            {m.moderation_ban()}
          </ContextMenu.Item>
        {/if}
      </ContextMenu.Group>
    {/if}
  </ContextMenu.Content>
</ContextMenu.Root>

<ConfirmDialog
  open={ctx.confirming !== null}
  onOpenChange={(v) => {
    if (!v) ctx.confirming = null;
    deleteSpan = DeleteSpan.None;
  }}
  title={ctx.confirming === ModAction.Ban
    ? m.moderation_ban_confirm_title({ name: ctx.name })
    : m.moderation_kick_confirm_title({ name: ctx.name })}
  description={ctx.confirming === ModAction.Ban
    ? m.moderation_ban_confirm_desc()
    : m.moderation_kick_confirm_desc()}
  confirmLabel={ctx.confirming === ModAction.Ban ? m.moderation_ban() : m.moderation_kick()}
  busy={ctx.busy}
  onConfirm={() => ctx.confirming && ctx.moderate(ctx.confirming, { deleteSpan })}
>
  {#if ctx.confirming === ModAction.Ban}
    <div class="grid gap-2">
      <span class="text-sm font-medium">{m.moderation_delete_history()}</span>
      <Select
        bind:value={deleteSpan}
        options={DELETE_SPANS}
        triggerProps={{ class: "w-full" }}
      />
      {#if deleteSpan !== DeleteSpan.None}
        <span class="text-muted-foreground text-xs">
          {m.moderation_delete_history_warning()}
        </span>
      {/if}
    </div>
  {/if}
</ConfirmDialog>
