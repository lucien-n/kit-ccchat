<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { api } from "$lib/api";
  import * as app from "$lib/app";
  import { channelNameTaken } from "$lib/channels";
  import { spaForm } from "$lib/forms";
  import { channelTypeSpecs } from "$lib/specs";
  import { channels } from "$lib/stores";
  import { cn } from "$lib/utils";
  import { Button } from "&/button";
  import * as Dialog from "&/dialog";
  import * as Form from "&/form";
  import { Input } from "&/input";
  import { ChannelType, createChannelBody } from "@motus/shared";

  let {
    open = $bindable(false),
    initialType = ChannelType.Text,
  }: {
    open?: boolean;
    initialType?: ChannelType;
  } = $props();

  const form = spaForm(
    createChannelBody,
    // eslint-disable-next-line svelte/no-unused-svelte-ignore
    // svelte-ignore state_referenced_locally
    { name: "", type: initialType },
    {
      toast: false,
      fallback: m.channel_create_failed(),
      onValid: async (data) => {
        const { channel } = await api.channels.create(data);
        await channels.load();
        if (channel.type === ChannelType.Text) app.selectChannel(channel.id);
        open = false;
      },
    },
  );

  const { form: formData, enhance, submitting } = form;

  const taken = $derived(channelNameTaken($formData.name, $formData.type, channels.list));

  // One instance, reused for both the text and voice buttons, so reseed each
  // time it opens from whichever button was clicked.
  $effect(() => {
    if (!open) return;
    $formData.name = "";
    $formData.type = initialType;
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-w-sm">
    <Dialog.Header>
      <Dialog.Title>{m.channel_create_title()}</Dialog.Title>
    </Dialog.Header>

    <form method="POST" use:enhance class="space-y-4">
      <div class="grid grid-cols-2 gap-2">
        {#each Object.values(channelTypeSpecs) as option (option.value)}
          {@const Icon = option.icon}
          <button
            type="button"
            class={cn(
              "flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors",
              $formData.type === option.value
                ? "border-primary bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted/50",
            )}
            onclick={() => ($formData.type = option.value)}
          >
            <Icon class="size-4" />
            {option.label}
          </button>
        {/each}
      </div>

      <Form.Field {form} name="name">
        <Form.Control>
          {#snippet children({ props })}
            <Form.Label>{m.common_name()}</Form.Label>
            <Input
              {...props}
              bind:value={$formData.name}
              placeholder={$formData.type === ChannelType.Voice
                ? m.channel_name_placeholder_voice()
                : m.channel_name_placeholder_text()}
              autocomplete="off"
              aria-invalid={taken || undefined}
            />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
        {#if taken}
          <p class="text-destructive text-sm">
            {m.channel_name_taken({ type: $formData.type })}
          </p>
        {/if}
      </Form.Field>

      <Dialog.Footer>
        <Button type="button" variant="ghost" onclick={() => (open = false)}>
          {m.common_cancel()}
        </Button>
        <Form.Button disabled={$submitting || taken}>{m.common_create()}</Form.Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
