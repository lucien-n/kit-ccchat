<script lang="ts">
  import UserAvatar from "$lib/components/common/user-avatar.svelte";
  import { voice } from "$lib/stores";
  import { cn } from "$lib/utils";
  import { type MuteState } from "$lib/voice-mute";
  import { Button } from "&/button";
  import type { Channel, VoiceMember } from "@ccchat/shared";
  import { HeadphoneOff, Maximize, MicOff } from "@lucide/svelte";
  import type { Track } from "livekit-client";
  import { UserCard } from "../common/user-card";

  interface Props {
    member: VoiceMember;
    channel: Channel;
    speaking: boolean;
    muteState: MuteState;
    screen: Track | null;
    camera: Track | null;
  }
  const { member, channel, speaking, muteState, screen, camera }: Props = $props();

  // A screen share is the watchable content, so it wins the tile; the camera
  // fills it otherwise. Screens letterbox (object-contain), a webcam fills
  // (object-cover) the way a video call does.
  const track = $derived(screen ?? camera);
  const isScreen = $derived(!!screen);

  let videoEl = $state<HTMLVideoElement | null>(null);

  // adaptiveStream only pulls frames for an attached, visible element, so an
  // unwatched tile costs nothing until it mounts its video here.
  $effect(() => {
    const node = videoEl;
    const current = track;
    if (!node || !current) return;
    current.attach(node);
    return () => {
      current.detach(node);
    };
  });
</script>

<UserCard userId={member.id} class="block w-full">
  <div
    class={cn(
      "group bg-muted/40 relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl ring-2 ring-transparent transition-[--tw-ring-color]",
      speaking && "ring-green-500",
    )}
  >
    {#if track}
      <video
        bind:this={videoEl}
        autoplay
        muted
        playsinline
        class={cn("h-full w-full bg-black", isScreen ? "object-contain" : "object-cover")}
      ></video>
      {#if isScreen}
        <Button
          variant="secondary"
          size="icon-sm"
          class="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
          title="Watch {member.displayName}'s stream"
          onclick={() => voice.watch(channel, member.id)}
        >
          <Maximize class="size-4" />
        </Button>
      {/if}
    {:else}
      <UserAvatar
        user={member}
        class={cn("size-20", speaking && "ring-2 ring-green-500")}
        fallbackClass="text-2xl"
      />
    {/if}

    <div
      class="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-lg bg-black/55 px-2 py-0.5 text-xs text-white"
    >
      {#if muteState === "forced"}
        <MicOff
          class="size-3 shrink-0 text-amber-400"
          aria-label="muted by a moderator"
        />
      {:else if muteState === "self"}
        <MicOff class="size-3 shrink-0" aria-label="muted" />
      {/if}
      {#if member.deafened}
        <HeadphoneOff class="size-3 shrink-0" aria-label="deafened" />
      {/if}
      <span class="truncate font-medium">{member.displayName}</span>
    </div>
  </div>
</UserCard>
