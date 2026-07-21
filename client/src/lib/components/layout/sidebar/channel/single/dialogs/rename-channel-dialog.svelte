<script lang="ts">
  import { getChannelContext } from "$lib/context/channel.svelte";
  import { apiErrorMessage, fail } from "$lib/forms";
  import { channels } from "$lib/stores/channels.svelte";
  import { Button } from "&/button";
  import * as Dialog from "&/dialog";
  import * as Form from "&/form";
  import { Input } from "&/input";
  import { channelNameKey, renameChannelBody } from "@ccchat/shared";
  import { defaults, setMessage, superForm } from "sveltekit-superforms";
  import { zod4, zod4Client } from "sveltekit-superforms/adapters";

  const ctx = getChannelContext();

  const form = superForm(defaults({ name: ctx.channel.name }, zod4(renameChannelBody)), {
    SPA: true,
    validators: zod4Client(renameChannelBody),
    resetForm: false,
    onUpdate: async ({ form }) => {
      if (!form.valid) return;
      try {
        await ctx.rename(form.data.name);
      } catch (err) {
        setMessage(form, fail(apiErrorMessage(err, "failed to rename channel")));
      }
    },
  });

  const { form: formData, enhance, submitting } = form;

  const taken = $derived.by(() => {
    const key = channelNameKey($formData.name);
    if (!key || key === channelNameKey(ctx.channel.name)) return false;
    return channels.list.some(
      (c) => c.type === ctx.channel.type && channelNameKey(c.name) === key,
    );
  });

  $effect(() => {
    if (ctx.renaming) $formData.name = ctx.channel.name;
  });
</script>

<Dialog.Root bind:open={ctx.renaming}>
  <Dialog.Content class="max-w-sm">
    <Dialog.Header>
      <Dialog.Title>Rename channel</Dialog.Title>
    </Dialog.Header>

    <form method="POST" use:enhance class="space-y-4">
      <Form.Field {form} name="name">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>Name</Form.Label>
            <Input
              {...props}
              bind:value={$formData.name}
              autocomplete="off"
              aria-invalid={taken || undefined}
            />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
        {#if taken}
          <p class="text-destructive text-sm">
            There's already a {ctx.channel.type} channel with that name.
          </p>
        {/if}
      </Form.Field>

      <Dialog.Footer>
        <Button type="button" variant="ghost" onclick={() => (ctx.renaming = false)}>
          Cancel
        </Button>
        <Form.Button disabled={$submitting || taken}>Rename</Form.Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
