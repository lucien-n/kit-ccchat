<script lang="ts">
  import ConfirmDialog from "$lib/components/common/confirm-dialog.svelte";
  import { getChannelContext } from "$lib/context/channel.svelte";

  const ctx = getChannelContext();
</script>

<ConfirmDialog
  bind:open={ctx.confirmingDeletion}
  title="Delete"
  description="This action is irrevocable, every messages will be deleted."
  confirmLabel="Delete"
  confirmVariant="destructive"
  busy={ctx.busy}
  onConfirm={() => ctx.remove()}
/>
