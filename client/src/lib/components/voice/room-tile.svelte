<script lang="ts">
  import UserAvatar from "$lib/components/common/user-avatar.svelte";
  import { voice } from "$lib/stores/voice.svelte";
  import { cn } from "$lib/utils";
  import { Button } from "&/button";
  import type { Channel, VoiceMember } from "@ccchat/shared";
  import { HeadphoneOff, MicOff, Maximize } from "@lucide/svelte";
  import type { Track } from "livekit-client";

  interface Props {
    member: VoiceMember;
    channel: Channel;
    speaking: boolean;
    muted: boolean;
    track: Track | null;
  }
  const { member, channel, speaking, muted, track }: Props = $props();

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

<div
  class={cn(
    "group bg-muted/40 relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl ring-2 ring-transparent transition-[--tw-ring-color]",
    speaking && "ring-green-500",
  )}
>
  {#if track}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video
      bind:this={videoEl}
      autoplay
      muted
      playsinline
      class="h-full w-full bg-black object-contain"
    ></video>
    <Button
      variant="secondary"
      size="icon-sm"
      class="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
      title="Watch {member.displayName}'s stream"
      onclick={() => voice.watch(channel, member.id)}
    >
      <Maximize class="size-4" />
    </Button>
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
    {#if muted}
      <MicOff class="size-3 shrink-0" aria-label="muted" />
    {/if}
    {#if member.deafened}
      <HeadphoneOff class="size-3 shrink-0" aria-label="deafened" />
    {/if}
    <span class="truncate font-medium">{member.displayName}</span>
  </div>
</div>
