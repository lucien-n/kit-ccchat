<script lang="ts">
  import { getChannelContext } from "$lib/context/channel.svelte";
  import * as ContextMenu from "&/context-menu";
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
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {@render children()}
  </ContextMenu.Trigger>

  <ContextMenu.Content>
    <ContextMenu.Group>
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
