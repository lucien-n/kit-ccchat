<script lang="ts" generics="OptionValue extends SelectOptionValue">
  import type { WithoutChild } from "$lib/utils";
  import * as Select from "&/select";
  import { Select as SelectPrimitive } from "bits-ui";
  import type { SelectOption, SelectOptionValue } from "./types";

  interface Props {
    value: OptionValue | null;
    options: SelectOption<OptionValue>[];
    placeholder?: string;
    triggerProps?: WithoutChild<SelectPrimitive.TriggerProps>;
  }
  let { value = $bindable(), options, placeholder = "", triggerProps }: Props = $props();

  const selectedOption = $derived(options.find((opt) => opt.value === value));
</script>

<Select.Root
  type="single"
  bind:value={() => value ?? undefined, (newValue) => (value = newValue ?? null)}
>
  <Select.Trigger {...triggerProps}>
    {selectedOption?.label ?? placeholder}
  </Select.Trigger>
  <Select.Content>
    <Select.Group>
      {#each options as opt (opt.value)}
        <Select.Item value={opt.value}>{opt.label}</Select.Item>
      {/each}
    </Select.Group>
  </Select.Content>
</Select.Root>
