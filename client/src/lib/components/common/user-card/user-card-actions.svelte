<script lang="ts">
  import { ModAction } from "$lib/api";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import * as ContextMenu from "$lib/components/ui/context-menu";
  import { getUserContext } from "$lib/context/user.svelte";
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
                  onSelect={() => ctx.moderate(ModAction.Mute, d.minutes)}
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
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={ctx.busy}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        disabled={ctx.busy}
        onclick={() => ctx.confirming && ctx.moderate(ctx.confirming)}
      >
        {ctx.confirming === ModAction.Ban ? "Ban" : "Kick"}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
