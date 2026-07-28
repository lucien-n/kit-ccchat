<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { setup } from "$lib/app";
  import { apiErrorMessage, fail, toastMessage } from "$lib/forms";
  import * as Card from "&/card";
  import * as Form from "&/form";
  import { Input } from "&/input";
  import { setupBody } from "@ccchat/shared";
  import { defaults, setMessage, superForm } from "sveltekit-superforms";
  import { zod4, zod4Client } from "sveltekit-superforms/adapters";

  const form = superForm(
    defaults(
      { communityName: "", username: "", displayName: "", password: "" },
      zod4(setupBody),
    ),
    {
      SPA: true,
      validators: zod4Client(setupBody),
      resetForm: false,
      onUpdate: async ({ form }) => {
        if (!form.valid) return;
        try {
          await setup(form.data);
          await goto(resolve("/"));
        } catch (err) {
          setMessage(form, fail(apiErrorMessage(err, "something went wrong")));
        }
      },
      onUpdated: toastMessage,
    },
  );

  const { form: formData, enhance, submitting } = form;
</script>

<div class="grid min-h-dvh place-items-center p-4">
  <Card.Root class="w-full max-w-md">
    <Card.Header class="text-center">
      <Card.Title class="text-2xl">Welcome to ccchat</Card.Title>
      <Card.Description>
        This community is brand new. Name it and create your owner account - you'll get an
        invite code for your friends.
      </Card.Description>
    </Card.Header>

    <form method="POST" use:enhance>
      <Card.Content class="space-y-4">
        <Form.Field {form} name="communityName">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Community name</Form.Label>
              <Input
                {...props}
                bind:value={$formData.communityName}
                placeholder="e.g. The Group Chat"
                autocomplete="off"
              />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>

        <Form.Field {form} name="username">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Your username</Form.Label>
              <Input
                {...props}
                bind:value={$formData.username}
                placeholder="lowercase, 2–24 chars"
                autocomplete="username"
              />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>

        <Form.Field {form} name="password">
          <Form.Control>
            {#snippet children({ props })}
              <Form.Label>Your password</Form.Label>
              <Input
                {...props}
                type="password"
                bind:value={$formData.password}
                placeholder="at least 8 characters"
                autocomplete="new-password"
              />
            {/snippet}
          </Form.Control>
          <Form.FieldErrors />
        </Form.Field>
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
