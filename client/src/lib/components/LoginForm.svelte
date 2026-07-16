<script lang="ts">
  import { chat } from "$lib/chat.svelte";
  import * as Alert from "$lib/components/ui/alert";
  import * as Card from "$lib/components/ui/card";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { apiErrorMessage } from "$lib/forms";
  import { loginBody } from "@ccchat/shared";
  import { TriangleAlert } from "@lucide/svelte";
  import { defaults, setMessage, superForm } from "sveltekit-superforms";
  import { zod4, zod4Client } from "sveltekit-superforms/adapters";

  const form = superForm(
    defaults({ username: "", password: "" }, zod4(loginBody)),
    {
      SPA: true,
      validators: zod4Client(loginBody),
      resetForm: false,
      onUpdate: async ({ form }) => {
        if (!form.valid) return;
        try {
          await chat.login(form.data.username, form.data.password);
        } catch (err) {
          setMessage(form, apiErrorMessage(err, "something went wrong"), {
            status: 401,
          });
        }
      },
    },
  );

  const { form: formData, enhance, submitting, message } = form;
</script>

<form method="POST" use:enhance>
  <Card.Content class="space-y-4">
    <Form.Field {form} name="username">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Username</Form.Label>
          <Input
            {...props}
            bind:value={$formData.username}
            autocomplete="username"
          />
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>

    <Form.Field {form} name="password">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Password</Form.Label>
          <Input
            {...props}
            type="password"
            bind:value={$formData.password}
            autocomplete="current-password"
          />
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>

    {#if $message}
      <Alert.Root variant="destructive">
        <TriangleAlert class="size-4" />
        <Alert.Description>{$message}</Alert.Description>
      </Alert.Root>
    {/if}
  </Card.Content>

  <Card.Footer class="mt-6 flex-col gap-3">
    <Form.Button class="w-full" disabled={$submitting}>
      {$submitting ? "Please wait…" : "Log in"}
    </Form.Button>
  </Card.Footer>
</form>
