<script lang="ts">
  import { channelTypeSpecs } from "$lib/specs";
  import { presence, voice } from "$lib/stores";
  import { Button } from "&/button";
  import { ChannelType, type Channel } from "@ccchat/shared";
  import DeafenButton from "./deafen-button.svelte";
  import HangupButton from "./hangup-button.svelte";
  import MicButton from "./mic-button.svelte";
  import RoomTile from "./room-tile.svelte";
  import ScreenShareButton from "./screen-share-button.svelte";
  import { SoundboardButton } from "./soundboard";

  interface Props {
    channel: Channel;
  }
  const { channel }: Props = $props();

  const Icon = channelTypeSpecs[ChannelType.Voice].icon;
  const joined = $derived(voice.channelId === channel.id);

  // The server-pushed roster is the base (it carries avatars and works before we
  // join); live LiveKit state overlays speaking and the subscribed screen track
  // once we're actually in the room.
  const tiles = $derived.by(() => {
    const roster = presence.voice[channel.id] ?? [];
    const live = new Map(voice.participants.map((p) => [p.identity, p]));
    return roster.map((member) => {
      const p = joined ? live.get(member.id) : undefined;
      return {
        member,
        speaking: p?.speaking ?? false,
        muted: p?.muted ?? member.muted,
        track: voice.screens[member.id] ?? null,
      };
    });
  });
</script>

<div class="flex min-h-0 flex-1 flex-col">
  <header class="flex h-12 shrink-0 items-center gap-1.5 border-b px-4 font-semibold">
    <Icon class="text-muted-foreground size-5 shrink-0" />
    <span class="truncate">{channel.name}</span>
    <span class="text-muted-foreground text-xs font-normal">
      {tiles.length}
      {tiles.length === 1 ? "person" : "people"}
    </span>
  </header>

  <div class="min-h-0 flex-1 overflow-y-auto p-4">
    {#if tiles.length === 0}
      <div class="text-muted-foreground flex h-full items-center justify-center text-sm">
        No one's here yet.
      </div>
    {:else}
      <div
        class="grid content-start gap-3"
        style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))"
      >
        {#each tiles as tile (tile.member.id)}
          <RoomTile
            {channel}
            member={tile.member}
            speaking={tile.speaking}
            muted={tile.muted}
            track={tile.track}
          />
        {/each}
      </div>
    {/if}
  </div>

  <div class="flex shrink-0 justify-center border-t p-3">
    {#if joined}
      <div class="flex items-center gap-1.5">
        <MicButton />
        <DeafenButton />
        <ScreenShareButton />
        <SoundboardButton />
        <HangupButton />
      </div>
    {:else}
      <Button onclick={() => voice.join(channel)}>
        <Icon class="size-4" />
        Join Voice
      </Button>
    {/if}
  </div>
</div>
