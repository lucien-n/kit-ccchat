<script lang="ts">
  import { Button, buttonVariants, type ButtonProps } from "&/button";
  import * as Select from "&/select";
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  interface Props {
    /** Toggle button props; `variant` also colors the device-picker trigger. */
    button: Partial<ButtonProps>;
    onToggle: () => void;
    devices: MediaDeviceInfo[];
    selectedId?: string;
    onSelect: (value: string) => void;
    pickerTitle: string;
    /** Prefix for devices the browser won't name, e.g. "Microphone 2". */
    fallbackLabel: string;
    children: Snippet;
  }

  let {
    button,
    onToggle,
    devices,
    selectedId,
    onSelect,
    pickerTitle,
    fallbackLabel,
    children,
  }: Props = $props();
</script>

<div class="flex rounded-2xl">
  <Button
    {...button}
    size="icon"
    onclick={onToggle}
    class={cn("rounded-r-none pl-0.75", button.class)}
  >
    {@render children()}
  </Button>
  <Select.Root type="single" value={selectedId} onValueChange={onSelect}>
    <Select.Trigger
      disabled={devices.length <= 1}
      title={pickerTitle}
      class={buttonVariants({
        variant: button.variant,
        // The trigger's chevron is hardcoded to text-muted-foreground, which
        // ignores the variant; make it follow the button color like the icon.
        class: "rounded-l-none bg-clip-padding pr-1 pl-px [&_svg]:text-current",
      })}
    ></Select.Trigger>
    <Select.Content>
      <Select.Group>
        {#each devices as device, i (device.deviceId)}
          <Select.Item
            value={device.deviceId}
            label={device.label || `${fallbackLabel} ${i + 1}`}
          />
        {/each}
      </Select.Group>
    </Select.Content>
  </Select.Root>
</div>
