<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import ConfirmDialog from "$lib/components/common/confirm-dialog.svelte";
  import { getChannelContext } from "$lib/context/channel.svelte";

  const ctx = getChannelContext();
</script>

<ConfirmDialog
  bind:open={ctx.confirmingDeletion}
  title={m.channel_delete_title()}
  description={m.channel_delete_description()}
  confirmLabel={m.common_delete()}
  confirmVariant="destructive"
  busy={ctx.busy}
  onConfirm={() => ctx.remove()}
/>
