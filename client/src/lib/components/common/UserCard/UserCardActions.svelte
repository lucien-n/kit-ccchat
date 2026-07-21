<script lang="ts">
  import { ModAction } from "$lib/api";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import * as ContextMenu from "$lib/components/ui/context-menu";
  import { apiErrorMessage } from "$lib/forms";
  import { canModerate, isMuted } from "$lib/members";
  import { members } from "$lib/stores/members.svelte";
  import { session } from "$lib/stores/session.svelte";
  import BanIcon from "@lucide/svelte/icons/ban";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import LogOutIcon from "@lucide/svelte/icons/log-out";
  import Volume2Icon from "@lucide/svelte/icons/volume-2";
  import VolumeXIcon from "@lucide/svelte/icons/volume-x";
  import type { Snippet } from "svelte";
  import { toast } from "svelte-sonner";

  interface Props {
    userId: string;
    children: Snippet;
  }

  const { userId, children }: Props = $props();

  let confirming = $state<Extract<ModAction, ModAction.Kick | ModAction.Ban> | null>(
    null,
  );
  let busy = $state(false);

  const target = $derived(members.byId(userId));
  const name = $derived(target?.displayName ?? "this member");
  const showModeration = $derived(canModerate(session.user, target));
  const muted = $derived(!!target && isMuted(target));

  async function act(action: ModAction, minutes?: number) {
    busy = true;
    try {
      await members.moderate(userId, action, minutes);
      toast.success(`${name} was ${PAST_TENSE[action]}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, "action failed"));
    } finally {
      busy = false;
      confirming = null;
    }
  }

  async function copyId() {
    await navigator.clipboard.writeText(userId);
    toast.success("user id copied");
  }

  const PAST_TENSE: Record<ModAction, string> = {
    [ModAction.Kick]: "kicked",
    [ModAction.Ban]: "banned",
    [ModAction.Unban]: "unbanned",
    [ModAction.Mute]: "muted",
    [ModAction.Unmute]: "unmuted",
  };

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
      <ContextMenu.Item onSelect={copyId}>
        <CopyIcon />
        Copy user id
      </ContextMenu.Item>
    </ContextMenu.Group>

    {#if showModeration}
      <ContextMenu.Separator />
      <ContextMenu.Group>
        <ContextMenu.GroupHeading>Moderation</ContextMenu.GroupHeading>
        {#if muted}
          <ContextMenu.Item disabled={busy} onSelect={() => act(ModAction.Unmute)}>
            <Volume2Icon />
            Unmute
          </ContextMenu.Item>
        {:else}
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger class="gap-2" disabled={busy}>
              <VolumeXIcon />
              Mute
            </ContextMenu.SubTrigger>
            <ContextMenu.SubContent class="z-100">
              {#each MUTE_DURATIONS as d (d.minutes)}
                <ContextMenu.Item onSelect={() => act(ModAction.Mute, d.minutes)}>
                  {d.label}
                </ContextMenu.Item>
              {/each}
            </ContextMenu.SubContent>
          </ContextMenu.Sub>
        {/if}
        <ContextMenu.Item disabled={busy} onSelect={() => (confirming = ModAction.Kick)}>
          <LogOutIcon />
          Kick
        </ContextMenu.Item>
        {#if target?.banned}
          <ContextMenu.Item disabled={busy} onSelect={() => act(ModAction.Unban)}>
            <BanIcon />
            Unban
          </ContextMenu.Item>
        {:else}
          <ContextMenu.Item
            variant="destructive"
            disabled={busy}
            onSelect={() => (confirming = ModAction.Ban)}
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
  open={confirming !== null}
  onOpenChange={(v) => {
    if (!v) confirming = null;
  }}
>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>
        {confirming === ModAction.Ban ? `Ban ${name}?` : `Kick ${name}?`}
      </AlertDialog.Title>
      <AlertDialog.Description>
        {#if confirming === ModAction.Ban}
          They lose every active session and cannot sign back in until unbanned.
        {:else}
          They lose every active session and need a fresh invite to return.
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={busy}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action disabled={busy} onclick={() => confirming && act(confirming)}>
        {confirming === ModAction.Ban ? "Ban" : "Kick"}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
