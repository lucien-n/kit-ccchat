<script lang="ts" generics="T extends Record<string, unknown>, U extends FormPath<T>">
  import * as Form from "&/form";
  import { Input } from "&/input";
  import type { FieldProps } from "formsnap";
  import type { Snippet } from "svelte";
  import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
  import type { FormPath } from "sveltekit-superforms";

  interface Props extends Omit<HTMLInputAttributes, "form" | "name" | "type" | "files"> {
    form: FieldProps<T, U>["form"];
    name: U;
    label?: string | Snippet;
    value?: string;
    type?: Exclude<HTMLInputTypeAttribute, "file">;
  }

  let { form, name, label, value = $bindable(), type, ...rest }: Props = $props();
</script>

<Form.Field {form} {name}>
  {#snippet children({ constraints })}
    <Form.Control>
      {#snippet children({ props })}
        {#if label}
          <Form.Label>
            {#if typeof label === "string"}{label}{:else}{@render label()}{/if}
          </Form.Label>
        {/if}
        <Input {...constraints} {...rest} {...props} {type} bind:value />
      {/snippet}
    </Form.Control>
    <Form.FieldErrors />
  {/snippet}
</Form.Field>
