<script lang="ts">
  import { voice, VoiceStatus } from "$lib/stores";
  import { Card } from "&/card";
  import Volume2Icon from "@lucide/svelte/icons/volume-2";
  import MicButton from "./mic-button.svelte";
  import DeafenButton from "./deafen-button.svelte";
  import HangupButton from "./hangup-button.svelte";
  import ScreenShareButton from "./screen-share-button.svelte";
  import { SoundboardButton } from "./soundboard";
  import { fly } from "$lib/motion";
  import { elasticInOut } from "svelte/easing";
</script>

<div transition:fly={{ y: 20, easing: elasticInOut }}>
  <Card class="m-2 shrink-0 gap-2.5 p-3">
    <div class="flex items-center justify-between gap-2">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1 truncate text-sm font-semibold">
          <Volume2Icon class="size-3.5 shrink-0" />
          <span class="truncate">{voice.channel?.name}</span>
        </div>
        <div class="text-xs text-green-500">
          {voice.status === VoiceStatus.Connected ? "Connected" : "Connecting…"}
        </div>
      </div>
      <HangupButton />
    </div>

    <div class="flex gap-1.5">
      <MicButton />
      <DeafenButton />
      <ScreenShareButton />
      <SoundboardButton />
    </div>
  </Card>
</div>
