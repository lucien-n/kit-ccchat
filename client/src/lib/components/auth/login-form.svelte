<script lang="ts">
  import { login } from "$lib/app";
  import { apiErrorMessage, fail, toastMessage } from "$lib/forms";
  import * as Card from "&/card";
  import * as Form from "&/form";
  import { Input } from "&/input";
  import { loginBody } from "@ccchat/shared";
  import { defaults, setMessage, superForm } from "sveltekit-superforms";
  import { zod4, zod4Client } from "sveltekit-superforms/adapters";

  const form = superForm(defaults({ username: "", password: "" }, zod4(loginBody)), {
    SPA: true,
    validators: zod4Client(loginBody),
    resetForm: false,
    onUpdate: async ({ form }) => {
      if (!form.valid) return;
      try {
        await login(form.data.username, form.data.password);
      } catch (err) {
        setMessage(form, fail(apiErrorMessage(err, "something went wrong")));
      }
    },
    onUpdated: toastMessage,
  });

  const { form: formData, enhance, submitting } = form;
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
            placeholder="john"
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
            placeholder="········"
          />
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>
  </Card.Content>

  <Card.Footer class="mt-6 flex-col gap-3">
    <Form.Button class="w-full" disabled={$submitting}>
      {$submitting ? "Please wait…" : "Log in"}
    </Form.Button>
  </Card.Footer>
</form>
