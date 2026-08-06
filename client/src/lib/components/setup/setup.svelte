<script lang="ts">
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
      <Card.Title class="text-2xl">Welcome to motus</Card.Title>
      <Card.Description>
        This community is brand new. Name it and create your owner account - you'll get an
        invite code for your friends.
      </Card.Description>
    </Card.Header>

    <form method="POST" use:enhance>
      <Card.Content class="space-y-4">
        <TextField
          {form}
          name="communityName"
          label="Community name"
          bind:value={$formData.communityName}
          placeholder="e.g. The Group Chat"
          autocomplete="off"
        />

        <TextField
          {form}
          name="username"
          label="Your username"
          bind:value={$formData.username}
          placeholder="lowercase, 2–24 chars"
          autocomplete="username"
        />

        <TextField
          {form}
          name="password"
          label="Your password"
          type="password"
          bind:value={$formData.password}
          placeholder="at least 8 characters"
          autocomplete="new-password"
        />
      </Card.Content>

      <Card.Footer class="mt-6 flex-col gap-3">
        <Form.Button class="w-full" disabled={$submitting}>
          {$submitting ? "Creating…" : "Create community"}
        </Form.Button>
        <p class="text-muted-foreground text-center text-xs">
          Whoever fills this in first becomes the owner, so do it now - before you share
          the address.
        </p>
      </Card.Footer>
    </form>
  </Card.Root>
</div>
