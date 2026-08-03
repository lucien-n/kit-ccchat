<script lang="ts" generics="T extends Record<string, unknown>, U extends FormPath<T>">
  import * as Form from "&/form";
  import { Input } from "&/input";
  import type { FieldProps } from "formsnap";
  import type { FormPath } from "sveltekit-superforms";
  import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";

  interface Props extends Omit<HTMLInputAttributes, "form" | "name" | "type" | "files"> {
    form: FieldProps<T, U>["form"];
    name: U;
    label?: string;
    value?: string;
    type?: Exclude<HTMLInputTypeAttribute, "file">;
  }

  let { form, name, label, value = $bindable(), type, ...rest }: Props = $props();
</script>

<Form.Field {form} {name}>
  <Form.Control>
    {#snippet children({ props })}
      {#if label}<Form.Label>{label}</Form.Label>{/if}
      <Input {...rest} {...props} {type} bind:value />
    {/snippet}
  </Form.Control>
  <Form.FieldErrors />
</Form.Field>
