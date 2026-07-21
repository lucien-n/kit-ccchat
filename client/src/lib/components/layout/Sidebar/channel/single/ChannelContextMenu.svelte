<script lang="ts">
  import * as ContextMenu from "$lib/components/ui/context-menu";
  import { getChannelContext } from "$lib/context/channel.svelte";
  import TrashIcon from "@lucide/svelte/icons/trash";
  import type { Snippet } from "svelte";
  import ConfirmChannelDeletionDialog from "./dialogs/ConfirmChannelDeletionDialog.svelte";

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

<ConfirmChannelDeletionDialog />
