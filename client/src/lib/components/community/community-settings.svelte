<script lang="ts">
  import InvitesPanel from "$lib/components/members/invites-panel.svelte";
  import ModerationList from "$lib/components/members/moderation-list.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Tabs from "$lib/components/ui/tabs";
  import { session } from "$lib/stores/session.svelte";
  import type { Component } from "svelte";
  import RolesPanel from "../members/roles-panel.svelte";
  import GeneralSettings from "./general-settings.svelte";
  import SystemPanel from "./system-panel.svelte";

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  const isOwner = $derived(session.isOwner);

  const TABS = $derived<
    {
      value: string;
      label: string;
      component: Component;
      isHidden?: boolean;
    }[]
  >([
    {
      value: "general",
      label: "General",
      component: GeneralSettings,
      isHidden: !isOwner,
    },
    {
      value: "moderation",
      label: "Moderation",
      component: ModerationList,
    },
    {
      value: "invites",
      label: "Invites",
      component: InvitesPanel,
    },
    {
      value: "roles",
      label: "Roles",
      component: RolesPanel,
    },
    {
      value: "system",
      label: "System",
      component: SystemPanel,
      isHidden: !isOwner,
    },
  ]);
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
        {#each TABS as tab (tab.value)}
          {#if !tab.isHidden}
            <Tabs.Trigger value={tab.value}>{tab.label}</Tabs.Trigger>
          {/if}
        {/each}
      </Tabs.List>

      <div class="flex h-[60vh] min-h-0 flex-1 flex-col">
        {#each TABS as tab (tab.value)}
          {#if !tab.isHidden}
            <Tabs.Content value={tab.value} class="mt-0 flex min-h-0 flex-1 flex-col">
              <tab.component />
            </Tabs.Content>
          {/if}
        {/each}
      </div>
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>
