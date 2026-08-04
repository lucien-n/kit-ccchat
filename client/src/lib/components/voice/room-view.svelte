<script lang="ts">
  import { flip, scale } from "$lib/motion";
  import { channelTypeSpecs } from "$lib/specs";
  import { presence, voice } from "$lib/stores";
  import { muteState } from "$lib/voice-mute";
  import { Button } from "&/button";
  import { ChannelType, type Channel } from "@ccchat/shared";
  import { backOut } from "svelte/easing";
  import CameraButton from "./camera-button.svelte";
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
  const joined = $derived(voice.channel?.id === channel.id);

  // The server-pushed roster is the base (it carries avatars and works before we
  // join); live LiveKit state overlays speaking and the subscribed screen track
  // once we're actually in the room.
  const roster = $derived.by(() => {
    const roster = presence.voice[channel.id] ?? [];
    const live = new Map(voice.participants.map((p) => [p.identity, p]));
    return roster.map((member) => {
      const p = joined ? live.get(member.id) : undefined;
      return {
        member,
        speaking: p?.speaking ?? false,
        muteState: muteState(member, p?.muted),
        screen: voice.share.screens[member.id] ?? null,
        camera: voice.share.cameras[member.id] ?? null,
      };
    });
  });

  const tiles = $derived([
    ...roster.flatMap((p) =>
      p.screen
        ? {
            ...p,
            camera: null,
            muteState: null,
            speaking: false,
            id: `screen-${p.member.id}`,
          }
        : [],
    ),
    ...roster.map((p) => ({ ...p, screen: null, id: p.member.id })),
  ]);
</script>

<div class="flex min-h-0 flex-1 flex-col">
  <header class="flex h-12 shrink-0 items-center gap-1.5 border-b px-4 font-semibold">
    <Icon class="text-muted-foreground size-5 shrink-0" />
    <span class="truncate">{channel.name}</span>
    <span class="text-muted-foreground text-xs font-normal">
      {roster.length}
      {roster.length === 1 ? "person" : "people"}
    </span>
  </header>

  <div class="min-h-0 flex-1 overflow-y-auto p-4">
    {#if roster.length === 0}
      <div class="text-muted-foreground flex h-full items-center justify-center text-sm">
        No one's here yet.
      </div>
    {:else}
      <div
        class="grid content-start gap-3"
        style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))"
      >
        {#each tiles as tile (tile.id)}
          <div
            animate:flip={{ duration: 250, easing: backOut }}
            transition:scale={{ duration: 200, start: 0.85, easing: backOut }}
          >
            <RoomTile
              {channel}
              member={tile.member}
              speaking={tile.speaking}
              muteState={tile.muteState}
              screen={tile.screen}
              camera={tile.camera}
            />
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="flex shrink-0 justify-center border-t p-3">
    {#if joined}
      <div class="flex items-center gap-1.5">
        <MicButton />
        <DeafenButton />
        <CameraButton />
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
