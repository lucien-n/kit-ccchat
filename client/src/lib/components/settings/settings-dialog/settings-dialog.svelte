<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import * as Dialog from "&/dialog";
  import * as Tabs from "&/tabs";
  import { SETTINGS_DIALOG_TAB_SPECS, SettingsDialogTab } from ".";

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="w-full sm:max-w-3xl">
    <Dialog.Header>
      <Dialog.Title>{m.settings_title()}</Dialog.Title>
    </Dialog.Header>

    <Tabs.Root value={SettingsDialogTab.Profile} class="w-full">
      <Tabs.List class="w-full">
        {#each Object.entries(SETTINGS_DIALOG_TAB_SPECS) as [tab, spec] (tab)}
          <Tabs.Trigger value={tab}>{spec.title()}</Tabs.Trigger>
        {/each}
      </Tabs.List>

      {#each Object.entries(SETTINGS_DIALOG_TAB_SPECS) as [tab, spec] (tab)}
        <Tabs.Content value={tab} class="w-full space-y-6 pt-4">
          <spec.component />
        </Tabs.Content>
      {/each}
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>
