<script lang="ts">
  import { MicStatus, voice } from "$lib/stores/voice.svelte";
  import { Button, type ButtonProps } from "&/button";
  import {
    Mic,
    MicOff,
    Phone,
    ScreenShare,
    ScreenShareOff,
    Volume2,
  } from "@lucide/svelte";

  // getDisplayMedia does not exist on iOS Safari or Android Chrome, so the
  // button would only ever throw there.
  const canScreenShare =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  const MIC_STATUS_BUTTON_PROPS: Record<MicStatus, Partial<ButtonProps>> = {
    [MicStatus.NotAllowed]: {
      variant: "secondary",
      class: "bg-amber-400/50 hover:bg-amber-400/30",
      title: "Microphone blocked - enable it in your browser to talk",
    },
    [MicStatus.MutedByMod]: {
      variant: "destructive",
      title: "You are muted by a moderator",
      disabled: true,
    },
    [MicStatus.Muted]: {
      variant: "secondary",
      title: "Unmute",
    },
    [MicStatus.Enabled]: {
      variant: "default",
      title: "Mute",
    },
  };

  // Anything but a live, transmitting mic shows the crossed-out icon.
  const micOff = $derived(voice.micStatus !== MicStatus.Enabled);
</script>

<div
  class="bg-sidebar-accent/40 flex shrink-0 items-center justify-between space-y-2 border-t p-2"
>
  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-1 truncate text-sm font-semibold">
      <Volume2 class="size-3.5 shrink-0" />
      <span class="truncate">{voice.channelName}</span>
    </div>
    <div class="text-xs text-green-500">
      {voice.status === "connected"
        ? `Connected · ${voice.participants.length}`
        : "Connecting…"}
    </div>
  </div>

  <div class="flex justify-end gap-1.5">
    <Button
      {...MIC_STATUS_BUTTON_PROPS[voice.micStatus]}
      size="icon"
      onclick={() => voice.toggleMic()}
    >
      {#if micOff}
        <MicOff class="size-4" />
      {:else}
        <Mic class="size-4" />
      {/if}
    </Button>
    {#if canScreenShare}
      <Button
        variant={voice.isSharing ? "default" : "secondary"}
        size="icon"
        disabled={!voice.canPublish}
        title={voice.isSharing ? "Stop sharing your screen" : "Share your screen"}
        onclick={() => voice.toggleScreenShare()}
      >
        {#if voice.isSharing}
          <ScreenShareOff class="size-4" />
        {:else}
          <ScreenShare class="size-4" />
        {/if}
      </Button>
    {/if}
    <Button
      variant="secondary"
      size="icon"
      onclick={() => voice.leave()}
      title="Disconnect"
    >
      <Phone class="size-4 rotate-135" />
      <span class="sr-only">Leave</span>
    </Button>
  </div>
</div>
