<script lang="ts">
  import { DeleteSpan, ModAction } from "$lib/api";
  import { Select } from "$lib/components/common/select";
  import { getUserContext } from "$lib/context/user.svelte";
  import * as AlertDialog from "&/alert-dialog";
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

  const MUTE_DURATIONS = [
    { minutes: 5, label: "5 minutes" },
    { minutes: 60, label: "1 hour" },
    { minutes: 1440, label: "1 day" },
    { minutes: 10080, label: "1 week" },
  ];

  const DELETE_SPANS = [
    { value: DeleteSpan.None, label: "Don't delete any" },
    { value: DeleteSpan.Hour, label: "Previous hour" },
    { value: DeleteSpan.Day, label: "Previous 24 hours" },
    { value: DeleteSpan.Week, label: "Previous 7 days" },
    { value: DeleteSpan.All, label: "All messages" },
  ];

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
        Copy user id
      </ContextMenu.Item>
    </ContextMenu.Group>

    {#if ctx.showModeration}
      <ContextMenu.Separator />
      <ContextMenu.Group>
        <ContextMenu.GroupHeading>Moderation</ContextMenu.GroupHeading>
        {#if ctx.muted}
          <ContextMenu.Item
            disabled={ctx.busy}
            onSelect={() => ctx.moderate(ModAction.Unmute)}
          >
            <Volume2Icon />
            Unmute
          </ContextMenu.Item>
        {:else}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger class="gap-2" disabled={ctx.busy}>
              <VolumeXIcon />
              Mute
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
          Kick
        </ContextMenu.Item>
        {#if ctx.member?.banned}
          <ContextMenu.Item
            disabled={ctx.busy}
            onSelect={() => ctx.moderate(ModAction.Unban)}
          >
            <BanIcon />
            Unban
          </ContextMenu.Item>
        {:else}
          <ContextMenu.Item
            variant="destructive"
            disabled={ctx.busy}
            onSelect={() => (ctx.confirming = ModAction.Ban)}
          >
            <BanIcon />
            Ban
          </ContextMenu.Item>
        {/if}
      </ContextMenu.Group>
    {/if}
  </ContextMenu.Content>
</ContextMenu.Root>

<AlertDialog.Root
  open={ctx.confirming !== null}
  onOpenChange={(v) => {
    if (!v) ctx.confirming = null;
    deleteSpan = DeleteSpan.None;
  }}
>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>
        {ctx.confirming === ModAction.Ban ? `Ban ${ctx.name}?` : `Kick ${ctx.name}?`}
      </AlertDialog.Title>
      <AlertDialog.Description>
        {#if ctx.confirming === ModAction.Ban}
          They lose every active session and cannot sign back in until unbanned.
        {:else}
          They lose every active session and need a fresh invite to return.
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    {#if ctx.confirming === ModAction.Ban}
      <div class="grid gap-2">
        <span class="text-sm font-medium">Delete message history</span>
        <Select
          bind:value={deleteSpan}
          options={DELETE_SPANS}
          triggerProps={{ class: "w-full" }}
        />
        {#if deleteSpan !== DeleteSpan.None}
          <span class="text-muted-foreground text-xs">
            Permanently removes their messages and reactions in that span. This can't be
            undone.
          </span>
        {/if}
      </div>
    {/if}
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={ctx.busy}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        disabled={ctx.busy}
        onclick={() =>
          ctx.confirming && ctx.moderate(ctx.confirming, { deleteSpan })}
      >
        {ctx.confirming === ModAction.Ban ? "Ban" : "Kick"}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
