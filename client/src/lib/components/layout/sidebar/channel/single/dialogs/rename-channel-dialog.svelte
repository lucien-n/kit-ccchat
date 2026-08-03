<script lang="ts">
  import { channelNameTaken } from "$lib/channels";
  import { getChannelContext } from "$lib/context/channel.svelte";
  import { spaForm } from "$lib/forms";
  import { channels } from "$lib/stores";
  import { Button } from "&/button";
  import * as Dialog from "&/dialog";
  import * as Form from "&/form";
  import { Input } from "&/input";
  import { renameChannelBody } from "@ccchat/shared";

  const ctx = getChannelContext();

  const form = spaForm(
    renameChannelBody,
    { name: ctx.channel.name },
    {
      toast: false,
      fallback: "failed to rename channel",
      onValid: (data) => ctx.rename(data.name),
    },
  );

  const { form: formData, enhance, submitting } = form;

  const taken = $derived(
    channelNameTaken($formData.name, ctx.channel.type, channels.list, ctx.channel.name),
  );

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
