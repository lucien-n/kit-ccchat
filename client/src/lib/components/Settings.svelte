<script lang="ts">
  import { chat } from "$lib/chat.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Tabs from "$lib/components/ui/tabs";
  import { cn } from "$lib/utils";
  import AppearanceTab from "./settings/AppearanceTab.svelte";
  import CommunityTab from "./settings/CommunityTab.svelte";
  import ProfileTab from "./settings/ProfileTab.svelte";

  let { open = $bindable(false) }: { open?: boolean } = $props();

  const isOwner = $derived(chat.user?.role === "owner");
</script>

<!-- Dialog.Content only renders while open, so each tab mounts fresh and seeds
     its forms from the store — no reset bookkeeping needed here. -->
<Dialog.Root bind:open>
  <Dialog.Content class="max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Settings</Dialog.Title>
    </Dialog.Header>

    <Tabs.Root value="profile" class="w-full">
      <Tabs.List
        class={cn("grid w-full", isOwner ? "grid-cols-3" : "grid-cols-2")}
      >
        <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
        <Tabs.Trigger value="appearance">Appearance</Tabs.Trigger>
        {#if isOwner}
          <Tabs.Trigger value="community">Community</Tabs.Trigger>
        {/if}
      </Tabs.List>

      <Tabs.Content value="profile" class="space-y-6 pt-4">
        <ProfileTab />
      </Tabs.Content>

      <Tabs.Content value="appearance" class="space-y-6 pt-4">
        <AppearanceTab />
      </Tabs.Content>

      {#if isOwner}
        <Tabs.Content value="community" class="space-y-6 pt-4">
          <CommunityTab />
        </Tabs.Content>
      {/if}
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>
