<script lang="ts">
  import { cn } from "$lib/utils";
  import { Button, buttonVariants, type ButtonProps } from "&/button";
  import * as Select from "&/select";
  import type { Snippet } from "svelte";

  interface Props {
    button: Partial<ButtonProps>;
    onToggle: () => void;
    devices: MediaDeviceInfo[];
    selectedId?: string;
    onSelect: (value: string) => void;
    pickerTitle: string;
    fallbackLabel: string;
    children: Snippet;
  }
  const {
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
