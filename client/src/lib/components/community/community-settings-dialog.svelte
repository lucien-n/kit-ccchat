<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import InvitesPanel from "$lib/components/members/invites-panel.svelte";
  import ModerationList from "$lib/components/members/moderation-list.svelte";
  import { session } from "$lib/stores";
  import * as Dialog from "&/dialog";
  import * as Tabs from "&/tabs";
  import type { Component } from "svelte";
  import { MediaQuery } from "svelte/reactivity";
  import RolesPanel from "../members/roles-panel.svelte";
  import GeneralSettings from "./general-settings.svelte";
  import SystemPanel from "./system-panel.svelte";

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  const isOwner = $derived(session.isOwner);

  const desktop = new MediaQuery("(min-width: 640px)");

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
      label: m.community_tab_general(),
      component: GeneralSettings,
      isHidden: !isOwner,
    },
    {
      value: "moderation",
      label: m.community_tab_moderation(),
      component: ModerationList,
    },
    {
      value: "invites",
      label: m.community_tab_invites(),
      component: InvitesPanel,
    },
    {
      value: "roles",
      label: m.community_tab_roles(),
      component: RolesPanel,
    },
    {
      value: "system",
      label: m.community_tab_system(),
      component: SystemPanel,
      isHidden: !isOwner,
    },
  ]);
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="w-full max-sm:gap-4 max-sm:p-4 sm:max-w-6xl">
    <Dialog.Header>
      <Dialog.Title>{m.community_settings_title()}</Dialog.Title>
    </Dialog.Header>

    <Tabs.Root
      orientation={desktop.current ? "vertical" : "horizontal"}
      value={isOwner ? "general" : "moderation"}
      class="flex min-w-0 flex-col gap-4 sm:flex-row"
    >
      <Tabs.List
        class="max-sm:h-auto! max-sm:w-full max-sm:flex-wrap sm:w-40 sm:shrink-0"
      >
        {#each TABS as tab (tab.value)}
          {#if !tab.isHidden}
            <Tabs.Trigger value={tab.value} class="max-sm:flex-auto">
              {tab.label}
            </Tabs.Trigger>
          {/if}
        {/each}
      </Tabs.List>

      <div class="flex h-[60vh] min-h-0 min-w-0 flex-1 flex-col">
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
