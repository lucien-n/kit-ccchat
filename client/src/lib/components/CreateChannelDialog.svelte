<script lang="ts">
  import { api } from "$lib/api";
  import * as app from "$lib/app";
  import { Button } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { apiErrorMessage, fail } from "$lib/forms";
  import { channels } from "$lib/stores/channels.svelte";
  import { session } from "$lib/stores/session.svelte";
  import { cn } from "$lib/utils";
  import { ChannelType, createChannelBody } from "@ccchat/shared";
  import { Hash, Volume2 } from "@lucide/svelte";
  import { defaults, setMessage, superForm } from "sveltekit-superforms";
  import { zod4, zod4Client } from "sveltekit-superforms/adapters";

  let {
    open = $bindable(false),
    initialType = ChannelType.Text,
  }: {
    open?: boolean;
    initialType?: ChannelType;
  } = $props();

  const options = [
    { value: ChannelType.Text, label: "Text", icon: Hash },
    { value: ChannelType.Voice, label: "Voice", icon: Volume2 },
  ];

  const form = superForm(defaults({ name: "", type: initialType }, zod4(createChannelBody)), {
    SPA: true,
    validators: zod4Client(createChannelBody),
    resetForm: false,
    onUpdate: async ({ form }) => {
      if (!form.valid || !session.token) return;
      try {
        const { channel } = await api.createChannel(session.token, form.data);
        await channels.load();
        if (channel.type === ChannelType.Text) app.selectChannel(channel.id);
        open = false;
      } catch (err) {
        setMessage(form, fail(apiErrorMessage(err, "failed to create channel")));
      }
    },
  });

  const { form: formData, enhance, submitting } = form;

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
      <Dialog.Title>Create a channel</Dialog.Title>
    </Dialog.Header>

    <form method="POST" use:enhance class="space-y-4">
      <div class="grid grid-cols-2 gap-2">
        {#each options as option (option.value)}
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
            <Form.Label>Name</Form.Label>
            <Input
              {...props}
              bind:value={$formData.name}
              placeholder={$formData.type === ChannelType.Voice ? "General Voice" : "general"}
              autocomplete="off"
            />
          {/snippet}
        </Form.Control>
        <Form.FieldErrors />
      </Form.Field>

      <Dialog.Footer>
        <Button type="button" variant="ghost" onclick={() => (open = false)}>Cancel</Button>
        <Form.Button disabled={$submitting}>Create</Form.Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
