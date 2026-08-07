<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { community, session, ui } from "$lib/stores";
  import { Button } from "&/button";
  import SettingsIcon from "@lucide/svelte/icons/settings";
</script>

<header class="flex h-12 items-center gap-2 border-b px-4 font-semibold">
  {#if community.iconUrl}
    <img src={community.iconUrl} alt="" class="size-6 rounded-2xl object-cover" />
  {/if}
  <span class="truncate">{community.name}</span>
  <div class="ml-auto items-center">
    {#if session.isAdmin}
      <Button
        variant="ghost"
        size="icon"
        class="size-7"
        title={m.community_settings_title()}
        onclick={() => ui.openCommunitySettings()}
      >
        <SettingsIcon class="size-4" />
      </Button>
    {/if}
  </div>
</header>
