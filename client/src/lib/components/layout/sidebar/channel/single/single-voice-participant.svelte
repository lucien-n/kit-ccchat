<script lang="ts">
  import UserAvatar from "$lib/components/common/user-avatar.svelte";
  import { UserCard } from "$lib/components/common/user-card";
  import { m } from "$lib/paraglide/messages";
  import { voice, VOICE_DRAG_MIME } from "$lib/stores";
  import { cn } from "$lib/utils";
  import { muteState } from "$lib/voice-mute";
  import { Button } from "&/button";
  import HeadphoneOffIcon from "@lucide/svelte/icons/headphone-off";
  import MicOffIcon from "@lucide/svelte/icons/mic-off";
  import MonitorPlayIcon from "@lucide/svelte/icons/monitor-play";
  import VideoIcon from "@lucide/svelte/icons/video";
  import type { Channel, VoiceMember } from "@motus/shared";

  interface Props {
    member: VoiceMember;
    channel: Channel;
    onVoiceDragStart?: () => void;
    onVoiceDragEnd?: () => void;
  }
  const { member, channel, onVoiceDragStart, onVoiceDragEnd }: Props = $props();

  const participant = $derived(
    channel.id === voice.channel?.id
      ? voice.participants.find((p) => p.identity === member.id)
      : undefined,
  );
  const mute = $derived(muteState(member, participant?.muted));

  function handleDragStart(ev: DragEvent) {
    ev.stopPropagation();

    if (!ev.dataTransfer) return;

    ev.dataTransfer.setData(VOICE_DRAG_MIME, member.id);
    ev.dataTransfer.effectAllowed = "move";

    onVoiceDragStart?.();
  }

  function handleDragEnd(ev: DragEvent) {
    ev.stopPropagation();

    onVoiceDragEnd?.();
  }
</script>

<div
  class="group flex min-w-0 items-center gap-0.5"
  role="listitem"
  ondragstart={handleDragStart}
  ondragend={handleDragEnd}
  draggable="true"
>
  <UserCard
    userId={member.id}
    class="hover:bg-sidebar-accent min-w-0 flex-1 rounded-2xl px-1.5 py-1"
  >
    <div class="flex min-w-0 items-center gap-2">
      <UserAvatar
        user={member}
        class={cn("size-5 shrink-0", participant?.speaking && "ring-2 ring-green-500")}
        fallbackClass="bg-primary/70 text-[9px]"
      />
      <span class="text-muted-foreground truncate text-xs">
        {member.displayName}
      </span>
    </div>
  </UserCard>

  {#if mute}
    <MicOffIcon
      class={cn(
        "size-3.5 shrink-0",
        mute === "forced" ? "text-amber-400" : "text-muted-foreground/70",
      )}
      aria-label={mute === "forced"
        ? m.voice_muted_by_mod({ name: member.displayName })
        : m.voice_muted({ name: member.displayName })}
    />
  {/if}

  {#if member.deafened}
    <HeadphoneOffIcon
      class="text-muted-foreground/70 size-3.5 shrink-0"
      aria-label={m.voice_deafened({ name: member.displayName })}
    />
  {/if}

  {#if member.camera}
    <VideoIcon
      class="text-muted-foreground/70 size-3.5 shrink-0"
      aria-label={m.voice_camera_on({ name: member.displayName })}
    />
  {/if}

  {#if member.sharing}
    <Button
      variant="ghost"
      size="icon-xs"
      class="shrink-0 text-red-500 hover:text-red-500"
      title={m.voice_streaming_watch({ name: member.displayName })}
      onclick={() => voice.watch(channel, member.id)}
    >
      <MonitorPlayIcon class="size-3.5" />
      <span class="sr-only">{m.voice_watch_stream({ name: member.displayName })}</span>
    </Button>
  {/if}
</div>
