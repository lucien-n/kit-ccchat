<script lang="ts">
  import { MicStatus, voice } from "$lib/stores";
  import { Button, buttonVariants, type ButtonProps } from "&/button";
  import * as Select from "$lib/components/ui/select";
  import { Mic, MicOff } from "@lucide/svelte";

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
  const micButtonProps = $derived(MIC_STATUS_BUTTON_PROPS[voice.micStatus]);
  const micOff = $derived(voice.micStatus !== MicStatus.Enabled);

  const canPickDevice = $derived(voice.devices.inputs.length > 1);

  function label(device: MediaDeviceInfo, i: number): string {
    return device.label || `Microphone ${i + 1}`;
  }
</script>

<div class="flex rounded-2xl">
  <Button
    {...micButtonProps}
    size="icon"
    onclick={() => voice.toggleMic()}
    class="rounded-r-none pl-0.75"
  >
    {#if micOff}
      <MicOff class="size-4" />
    {:else}
      <Mic class="size-4" />
    {/if}
  </Button>
  <Select.Root
    type="single"
    value={voice.devices.inputId}
    onValueChange={(v) => voice.setAudioInput(v)}
  >
    <Select.Trigger
      disabled={!canPickDevice}
      title="Choose microphone"
      class={buttonVariants({
        variant: micButtonProps.variant,
        class: "rounded-l-none bg-clip-padding pr-1 pl-px [&_svg]:text-current",
      })}
    ></Select.Trigger>
    <Select.Content>
      <Select.Group>
        {#each voice.devices.inputs as device, i (device.deviceId)}
          <Select.Item value={device.deviceId} label={label(device, i)} />
        {/each}
      </Select.Group>
    </Select.Content>
  </Select.Root>
</div>
