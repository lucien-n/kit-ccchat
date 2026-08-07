<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { MicStatus, voice } from "$lib/stores";
  import { type ButtonProps } from "&/button";
  import MicIcon from "@lucide/svelte/icons/mic";
  import MicOffIcon from "@lucide/svelte/icons/mic-off";
  import ConfirmDialog from "../common/confirm-dialog.svelte";
  import DevicePickerButton from "./device-picker-button.svelte";

  const MIC_STATUS_BUTTON_PROPS = $derived<Record<MicStatus, Partial<ButtonProps>>>({
    [MicStatus.NotAllowed]: {
      variant: "secondary",
      class: "bg-amber-400/50 hover:bg-amber-400/30",
      title: m.mic_blocked(),
    },
    [MicStatus.MutedByMod]: {
      variant: "destructive",
      title: m.mic_muted_by_mod(),
      disabled: true,
    },
    [MicStatus.Muted]: {
      variant: "destructive",
      title: m.mic_unmute(),
    },
    [MicStatus.Enabled]: {
      variant: "secondary",
      title: m.mic_mute(),
    },
  });
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
  pickerTitle={m.mic_choose()}
  fallbackLabel={m.mic_label()}
>
  {#if micOff}
    <MicOffIcon class="size-4" />
  {:else}
    <MicIcon class="size-4" />
  {/if}
</DevicePickerButton>

<ConfirmDialog
  bind:open={isMicNotAllowedDialogOpen}
  title={m.mic_blocked_title()}
  onConfirm={() => (isMicNotAllowedDialogOpen = false)}
  confirmLabel={m.common_ok()}
>
  <p class="text-muted-foreground">{m.mic_allow_prompt()}</p>
</ConfirmDialog>
