<script lang="ts">
  import { api } from "$lib/api";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { apiErrorMessage } from "$lib/forms";
  import { channels } from "$lib/stores/channels.svelte";
  import type { Channel } from "@ccchat/shared";
  import { toast } from "svelte-sonner";

  interface Props {
    channel: Channel;
    isOpen: boolean;
  }

  let { channel, isOpen = $bindable(false) }: Props = $props();

  let isBusy = $state(false);

  async function handleDelete() {
    isBusy = true;

    try {
      await api.channels.delete(channel.id);
      await channels.load();
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to delete channel"));
    }

    isBusy = false;
  }
</script>

<AlertDialog.Root bind:open={isOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete</AlertDialog.Title>
      <AlertDialog.Description>
        This action is irrevocable, every messages will be deleted.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={isBusy}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action disabled={isBusy} onclick={handleDelete} variant="destructive">
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
