<script lang="ts">
  import { MicStatus, voice } from "$lib/stores";
  import { type ButtonProps } from "&/button";
  import { Mic, MicOff } from "@lucide/svelte";
  import ConfirmDialog from "../common/confirm-dialog.svelte";
  import DevicePickerButton from "./device-picker-button.svelte";

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
      variant: "destructive",
      title: "Unmute",
    },
    [MicStatus.Enabled]: {
      variant: "secondary",
      title: "Mute",
    },
  };
  const button = $derived(MIC_STATUS_BUTTON_PROPS[voice.micStatus]);
  const micOff = $derived(voice.micStatus !== MicStatus.Enabled);

  let isMicNotAllowedDialogOpen = $state(false);
</script>

<DevicePickerButton
  {button}
  onToggle={() => {
    if (voice.micStatus === MicStatus.NotAllowed) {
      isMicNotAllowedDialogOpen = true;
      return;
    }

    voice.toggleMic();
  }}
  devices={voice.devices.inputs}
  selectedId={voice.devices.inputId}
  onSelect={(v) => voice.setAudioInput(v)}
  pickerTitle="Choose microphone"
  fallbackLabel="Microphone"
>
  {#if micOff}
    <MicOff class="size-4" />
  {:else}
    <Mic class="size-4" />
  {/if}
</DevicePickerButton>

<ConfirmDialog
  bind:open={isMicNotAllowedDialogOpen}
  title="Microphone blocked"
  onConfirm={() => (isMicNotAllowedDialogOpen = false)}
  confirmLabel="Ok"
>
  <p class="text-muted-foreground">
    Please allow the use of your microphone in your browser to talk
  </p>
</ConfirmDialog>
