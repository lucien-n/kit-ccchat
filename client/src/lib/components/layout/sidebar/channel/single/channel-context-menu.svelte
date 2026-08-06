<script lang="ts">
  import { getChannelContext } from "$lib/context/channel.svelte";
  import { session } from "$lib/stores";
  import * as ContextMenu from "&/context-menu";
  import { ChannelType } from "@motus/shared";
  import HomeIcon from "@lucide/svelte/icons/home";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import TrashIcon from "@lucide/svelte/icons/trash";
  import type { Snippet } from "svelte";
  import ConfirmChannelDeletionDialog from "./dialogs/confirm-channel-deletion-dialog.svelte";
  import RenameChannelDialog from "./dialogs/rename-channel-dialog.svelte";

  interface Props {
    children: Snippet;
  }

  const { children }: Props = $props();

  const ctx = getChannelContext();
  const canSetMain = $derived(
    session.isAdmin && ctx.channel.type === ChannelType.Text && !ctx.channel.isMain,
  );
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {@render children()}
  </ContextMenu.Trigger>

  <ContextMenu.Content>
    <ContextMenu.Group>
      {#if canSetMain}
        <ContextMenu.Item onclick={() => ctx.setMain()}>
          <HomeIcon />
          Set as main channel
        </ContextMenu.Item>
      {/if}
      <ContextMenu.Item onclick={() => (ctx.renaming = true)}>
        <PencilIcon />
        Rename
      </ContextMenu.Item>
      <ContextMenu.Item
        variant="destructive"
        onclick={() => (ctx.confirmingDeletion = true)}
      >
        <TrashIcon />
        Delete
      </ContextMenu.Item>
    </ContextMenu.Group>
  </ContextMenu.Content>
</ContextMenu.Root>

<RenameChannelDialog />
<ConfirmChannelDeletionDialog />
