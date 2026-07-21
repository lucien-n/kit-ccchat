<script lang="ts">
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { getChannelContext } from "$lib/context/channel.svelte";

  const ctx = getChannelContext();
</script>

<AlertDialog.Root bind:open={ctx.confirmingDeletion}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete</AlertDialog.Title>
      <AlertDialog.Description>
        This action is irrevocable, every messages will be deleted.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={ctx.busy}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        disabled={ctx.busy}
        onclick={() => ctx.remove()}
        variant="destructive"
      >
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
