<script lang="ts">
  import { voice } from "$lib/stores/voice.svelte";
  import { Button } from "&/button";
  import { Mic, MicOff, PhoneOff, Volume2 } from "@lucide/svelte";
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

  {#if voice.micError}
    <p class="text-xs text-amber-500">{voice.micError}</p>
  {/if}

  <div class="flex justify-end gap-1.5">
    <Button
      variant={voice.micMuted
        ? "secondary"
        : !voice.canPublish
          ? "destructive"
          : "default"}
      size="icon"
      disabled={!voice.canPublish}
      title={!voice.canPublish
        ? "You are muted by a moderator"
        : voice.micMuted
          ? "Unmute"
          : "Mute"}
      onclick={() => voice.toggleMic()}
    >
      {#if !voice.canPublish}
        <MicOff class="size-4" />
      {:else if voice.micMuted}
        <MicOff class="size-4" />
      {:else}
        <Mic class="size-4" />
      {/if}
    </Button>
    <Button variant="destructive" size="icon" onclick={() => voice.leave()}>
      <PhoneOff class="size-4" />
      <span class="sr-only">Leave</span>
    </Button>
  </div>
</div>
