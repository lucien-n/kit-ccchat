<script lang="ts">
  import { voice } from "$lib/stores";
  import { type ButtonVariant } from "&/button";
  import { Headphones, HeadphoneOff } from "@lucide/svelte";
  import DevicePickerButton from "./device-picker-button.svelte";

  const variant: ButtonVariant = $derived(voice.deafened ? "destructive" : "secondary");
</script>

<DevicePickerButton
  button={{ variant, title: voice.deafened ? "Undeafen" : "Deafen" }}
  onToggle={() => voice.toggleDeafen()}
  devices={voice.devices.outputs}
  selectedId={voice.devices.outputId}
  onSelect={(v) => voice.setAudioOutput(v)}
  pickerTitle="Choose speaker"
  fallbackLabel="Speaker"
>
  {#if voice.deafened}
    <HeadphoneOff class="size-4" />
  {:else}
    <Headphones class="size-4" />
  {/if}
</DevicePickerButton>
