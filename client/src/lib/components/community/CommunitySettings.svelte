<script lang="ts">
  import InvitesPanel from "$lib/components/members/InvitesPanel.svelte";
  import ModerationList from "$lib/components/members/ModerationList.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Tabs from "$lib/components/ui/tabs";
  import { session } from "$lib/stores/session.svelte";
  import { Role } from "@ccchat/shared";
  import GeneralSettings from "./GeneralSettings.svelte";

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  const isOwner = $derived(session.user?.role === Role.Owner);
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="w-full sm:max-w-6xl">
    <Dialog.Header>
      <Dialog.Title>Community settings</Dialog.Title>
    </Dialog.Header>

    <Tabs.Root
      orientation="vertical"
      value={isOwner ? "general" : "moderation"}
      class="flex gap-4"
    >
      <Tabs.List class="w-40 shrink-0">
        {#if isOwner}
          <Tabs.Trigger value="general">General</Tabs.Trigger>
        {/if}
        <Tabs.Trigger value="moderation">Moderation</Tabs.Trigger>
        <Tabs.Trigger value="invites">Invites</Tabs.Trigger>
      </Tabs.List>

      <div class="flex h-[60vh] min-h-0 flex-1 flex-col">
        {#if isOwner}
          <Tabs.Content value="general" class="mt-0">
            <GeneralSettings />
          </Tabs.Content>
        {/if}

        <Tabs.Content value="moderation" class="mt-0 flex min-h-0 flex-1 flex-col">
          <ModerationList />
        </Tabs.Content>

        <Tabs.Content value="invites" class="mt-0 flex min-h-0 flex-1 flex-col">
          <InvitesPanel />
        </Tabs.Content>
      </div>
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>
