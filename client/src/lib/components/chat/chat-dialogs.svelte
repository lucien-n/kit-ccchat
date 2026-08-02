<script lang="ts">
  import CreateChannelDialog from "$lib/components/channel/create-channel-dialog.svelte";
  import { UserCard } from "$lib/components/common/user-card";
  import CommunitySettingsDialog from "$lib/components/community/community-settings-dialog.svelte";
  import { SettingsDialog } from "$lib/components/settings/settings-dialog";
  import { mentionCard } from "$lib/stores/mention-card.svelte";
  import { ui } from "$lib/stores/ui.svelte";
</script>

<CommunitySettingsDialog bind:open={ui.isCommunitySettingsDialogOpen} />
<SettingsDialog bind:open={ui.isSettingsDialogOpen} />
<CreateChannelDialog
  bind:open={ui.isCreateChannelDialogOpen}
  initialType={ui.createChannelType}
/>

{#if mentionCard.userId}
  <UserCard
    userId={mentionCard.userId}
    anchor={mentionCard.anchor}
    bind:open={mentionCard.open}
  />
{/if}
