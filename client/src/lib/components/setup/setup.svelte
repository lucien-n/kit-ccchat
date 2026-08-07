<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { setup } from "$lib/app";
  import TextField from "$lib/components/common/text-field.svelte";
  import { spaForm } from "$lib/forms";
  import * as Card from "&/card";
  import * as Form from "&/form";
  import { setupBody } from "@motus/shared";

  const form = spaForm(
    setupBody,
    { communityName: "", username: "", displayName: "", password: "" },
    {
      onValid: async (data) => {
        await setup(data);
        await goto(resolve("/"));
      },
    },
  );

  const { form: formData, enhance, submitting } = form;
</script>

<div class="grid min-h-dvh place-items-center p-4">
  <Card.Root class="w-full max-w-md">
    <Card.Header class="text-center">
      <Card.Title class="text-2xl">{m.setup_title()}</Card.Title>
      <Card.Description>{m.setup_description()}</Card.Description>
    </Card.Header>

    <form method="POST" use:enhance>
      <Card.Content class="space-y-4">
        <TextField
          {form}
          name="communityName"
          label={m.setup_community_name_label()}
          bind:value={$formData.communityName}
          placeholder={m.setup_community_name_placeholder()}
          autocomplete="off"
        />

        <TextField
          {form}
          name="username"
          label={m.setup_username_label()}
          bind:value={$formData.username}
          placeholder={m.auth_username_rules_placeholder()}
          autocomplete="username"
        />

        <TextField
          {form}
          name="password"
          label={m.setup_password_label()}
          type="password"
          bind:value={$formData.password}
          placeholder={m.auth_password_rules_placeholder()}
          autocomplete="new-password"
        />
      </Card.Content>

      <Card.Footer class="mt-6 flex-col gap-3">
        <Form.Button class="w-full" disabled={$submitting}>
          {$submitting ? m.setup_creating() : m.setup_create_community()}
        </Form.Button>
        <p class="text-muted-foreground text-center text-xs">{m.setup_owner_note()}</p>
      </Card.Footer>
    </form>
  </Card.Root>
</div>
