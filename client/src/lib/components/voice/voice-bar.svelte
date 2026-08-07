<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { fly } from "$lib/motion";
  import { voice, VoiceStatus } from "$lib/stores";
  import { Card } from "&/card";
  import Volume2Icon from "@lucide/svelte/icons/volume-2";
  import { elasticInOut } from "svelte/easing";
  import CameraButton from "./camera-button.svelte";
  import HangupButton from "./hangup-button.svelte";
  import ScreenShareButton from "./screen-share-button.svelte";
  import { SoundboardButton } from "./soundboard";
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
          {voice.status === VoiceStatus.Connected ? m.voice_connected() : m.voice_connecting()}
        </div>
      </div>
      <HangupButton variant="ghost" />
    </div>

    <div class="flex gap-1.5">
      <CameraButton class="flex-1" />
      <ScreenShareButton class="flex-1" />
      <SoundboardButton class="flex-1" />
    </div>
  </Card>
</div>
