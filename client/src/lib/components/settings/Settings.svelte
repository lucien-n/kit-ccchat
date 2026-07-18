<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Tabs from "$lib/components/ui/tabs";
  import AppearanceTab from "./AppearanceTab.svelte";
  import ProfileTab from "./ProfileTab.svelte";

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

    <Tabs.Root value="profile" class="w-full">
      <Tabs.List class="grid w-full grid-cols-2">
        <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
        <Tabs.Trigger value="appearance">Appearance</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="profile" class="space-y-6 pt-4">
        <ProfileTab />
      </Tabs.Content>

      <Tabs.Content value="appearance" class="space-y-6 pt-4">
        <AppearanceTab />
      </Tabs.Content>
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>
