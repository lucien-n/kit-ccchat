<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu";
  import type { Channel } from "@ccchat/shared";
  import TrashIcon from "@lucide/svelte/icons/trash";
  import type { Snippet } from "svelte";
  import ConfirmChannelDeletionDialog from "./dialogs/ConfirmChannelDeletionDialog.svelte";

  interface Props {
    channel: Channel;
    children: Snippet;
  }

  const { channel, children }: Props = $props();

  let isConfirmDeletionDialogOpen = $state(false);
</script>

<ContextMenu.Root>
  <ContextMenu.Trigger>
    {@render children()}
  </ContextMenu.Trigger>

  <ContextMenu.Content>
    <ContextMenu.Group>
      <ContextMenu.Item
        variant="destructive"
        onclick={() => (isConfirmDeletionDialogOpen = true)}
      >
        <TrashIcon />
        Delete
      </ContextMenu.Item>
    </ContextMenu.Group>
  </ContextMenu.Content>
</ContextMenu.Root>

<ConfirmChannelDeletionDialog bind:isOpen={isConfirmDeletionDialogOpen} {channel} />
