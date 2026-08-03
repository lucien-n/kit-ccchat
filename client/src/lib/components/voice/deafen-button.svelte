<script lang="ts">
  import { voice } from "$lib/stores";
  import { buttonVariants, Button, type ButtonVariant } from "&/button";
  import * as Select from "$lib/components/ui/select";
  import { Headphones, HeadphoneOff } from "@lucide/svelte";

  const variant: ButtonVariant = $derived(voice.deafened ? "destructive" : "secondary");
  const canPickDevice = $derived(voice.devices.outputs.length > 1);

  function label(device: MediaDeviceInfo, i: number): string {
    return device.label || `Speaker ${i + 1}`;
  }
</script>

<div class="flex rounded-2xl">
  <Button
    {variant}
    size="icon"
    onclick={() => voice.toggleDeafen()}
    title={voice.deafened ? "Undeafen" : "Deafen"}
    class="rounded-r-none pl-0.75"
  >
    {#if voice.deafened}
      <HeadphoneOff class="size-4" />
    {:else}
      <Headphones class="size-4" />
    {/if}
  </Button>
  <Select.Root
    type="single"
    value={voice.devices.outputId}
    onValueChange={(v) => voice.setAudioOutput(v)}
  >
    <Select.Trigger
      disabled={!canPickDevice}
      title="Choose speaker"
      class={buttonVariants({
        variant,
        // The trigger's chevron is hardcoded to text-muted-foreground, which
        // ignores the variant; make it follow the button color like the icon.
        class: "rounded-l-none bg-clip-padding pr-1 pl-px [&_svg]:text-current",
      })}
    ></Select.Trigger>
    <Select.Content>
      <Select.Group>
        {#each voice.devices.outputs as device, i (device.deviceId)}
          <Select.Item value={device.deviceId} label={label(device, i)} />
        {/each}
      </Select.Group>
    </Select.Content>
  </Select.Root>
</div>
