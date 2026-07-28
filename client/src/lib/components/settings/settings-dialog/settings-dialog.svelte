<script lang="ts">
  import * as Dialog from "&/dialog";
  import * as Tabs from "&/tabs";
  import { SETTINGS_DIALOG_TAB_SPECS, SettingsDialogTab } from ".";

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();
</script>

<!-- Dialog.Content only renders while open, so each tab mounts fresh. -->
<Dialog.Root bind:open>
  <Dialog.Content class="max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Settings</Dialog.Title>
    </Dialog.Header>

    <Tabs.Root value={SettingsDialogTab.Profile} class="w-full">
      <Tabs.List class="grid w-full grid-cols-2">
        {#each Object.entries(SETTINGS_DIALOG_TAB_SPECS) as [tab, spec] (tab)}
          <Tabs.Trigger value={tab}>{spec.title}</Tabs.Trigger>
        {/each}
      </Tabs.List>

      {#each Object.entries(SETTINGS_DIALOG_TAB_SPECS) as [tab, spec] (tab)}
        <Tabs.Content value={tab} class="space-y-6 pt-4">
          <spec.component />
        </Tabs.Content>
      {/each}
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>
