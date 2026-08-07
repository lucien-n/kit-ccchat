<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { getChatContext, type ChatPanel } from "$lib/context/chat.svelte";
  import { channelTypeSpecs } from "$lib/specs";
  import { channels, prefs, presence, ui, unread } from "$lib/stores";
  import { Button } from "&/button";
  import * as ToggleGroup from "&/toggle-group";
  import BellIcon from "@lucide/svelte/icons/bell";
  import BellOff from "@lucide/svelte/icons/bell-off";
  import MenuIcon from "@lucide/svelte/icons/menu";
  import SearchIcon from "@lucide/svelte/icons/search";
  import UsersIcon from "@lucide/svelte/icons/users";
  import { ChannelType } from "@motus/shared";
  import PinnedList from "./pinned-list.svelte";

  const chat = getChatContext();
  const Icon = channelTypeSpecs[ChannelType.Text].icon;
</script>

<header class="flex h-12 items-center justify-between gap-2 border-b px-2 sm:px-4">
  <div class="flex min-w-0 items-center gap-1.5 font-semibold">
    <Button
      variant="ghost"
      size="icon"
      class="shrink-0 sm:hidden"
      title={m.chat_channels_menu()}
      onclick={() => (ui.nav = true)}
    >
      <MenuIcon class="size-5" />
      {#if unread.total > 0}
        <span class="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full"
        ></span>
      {/if}
    </Button>
    <Icon class="text-muted-foreground size-5 shrink-0" />
    <span class="truncate">{channels.current?.name ?? m.chat_no_channel()}</span>
  </div>
  <div class="flex shrink-0 items-center gap-1 sm:gap-2">
    <PinnedList />

    <Button
      variant="ghost"
      size="icon"
      title={prefs.soundEnabled ? m.chat_mute_sound() : m.chat_unmute_sound()}
      onclick={() => prefs.toggleSound()}
    >
      {#if prefs.soundEnabled}
        <BellIcon class="size-4" />
      {:else}
        <BellOff class="size-4" />
      {/if}
    </Button>

    <ToggleGroup.Root
      type="single"
      variant="outline"
      value={chat.panel}
      onValueChange={(v) => (chat.panel = v as ChatPanel)}
    >
      <ToggleGroup.Item value="search" title={m.chat_search_messages()}>
        <SearchIcon class="size-4" />
      </ToggleGroup.Item>
      <ToggleGroup.Item
        value="members"
        title={m.chat_members_online_title({ count: presence.online.size })}
      >
        <UsersIcon class="size-4" />
        <span class="text-xs">
          {m.chat_online_count({ count: presence.online.size })}
        </span>
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  </div>
</header>
