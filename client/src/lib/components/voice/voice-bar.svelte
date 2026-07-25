<script lang="ts">
  import { voice, VoiceStatus } from "$lib/stores/voice.svelte";
  import Volume2Icon from "@lucide/svelte/icons/volume-2";
  import MicButton from "./mic-button.svelte";
  import DeafenButton from "./deafen-button.svelte";
  import HangupButton from "./hangup-button.svelte";
  import ScreenShareButton from "./screen-share-button.svelte";

  // getDisplayMedia does not exist on iOS Safari or Android Chrome, so the
  // button would only ever throw there.
</script>

<div
  class="bg-sidebar-accent/40 flex shrink-0 items-center justify-between space-y-2 border-t p-2"
>
  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-1 truncate text-sm font-semibold">
      <Volume2Icon class="size-3.5 shrink-0" />
      <span class="truncate">{voice.channelName}</span>
    </div>
    <div class="text-xs text-green-500">
      {voice.status === VoiceStatus.Connected ? "Connected" : "Connecting…"}
    </div>
  </div>

  <div class="flex justify-end gap-1.5">
    <MicButton />
    <DeafenButton />
    <ScreenShareButton />
    <HangupButton />
  </div>
</div>
