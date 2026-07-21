<script lang="ts">
  import { community } from "$lib/stores/community.svelte";
  import { realtime } from "$lib/stores/realtime.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { ui } from "$lib/stores/ui.svelte";
  import { cn } from "$lib/utils";
  import { Button } from "&/button";
  import SettingsIcon from "@lucide/svelte/icons/settings";
</script>

<header class="flex h-12 shrink-0 items-center gap-2 border-b px-4 font-semibold">
  {#if community.iconUrl}
    <img src={community.iconUrl} alt="" class="size-6 shrink-0 rounded-md object-cover" />
  {/if}
  <span class="truncate">{community.name}</span>
  <div class="ml-auto flex shrink-0 items-center gap-1">
    {#if session.isAdmin}
      <Button
        variant="ghost"
        size="icon"
        class="size-7"
        title="Community settings"
        onclick={() => ui.openCommunitySettings()}
      >
        <SettingsIcon class="size-4" />
      </Button>
    {/if}
    <span
      class={cn(
        "bg-muted-foreground size-2 shrink-0 rounded-full",
        realtime.status === "connected" && "bg-green-500",
        realtime.status === "connecting" && "bg-amber-500",
      )}
      title={realtime.status}
    ></span>
  </div>
</header>
