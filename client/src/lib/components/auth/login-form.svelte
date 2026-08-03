<script lang="ts">
  import { login } from "$lib/app";
  import TextField from "$lib/components/common/text-field.svelte";
  import { spaForm } from "$lib/forms";
  import * as Card from "&/card";
  import * as Form from "&/form";
  import { loginBody } from "@ccchat/shared";

  const form = spaForm(
    loginBody,
    { username: "", password: "" },
    { onValid: (data) => login(data.username, data.password) },
  );

  const { form: formData, enhance, submitting } = form;
</script>

<form method="POST" use:enhance>
  <Card.Content class="space-y-4">
    <TextField
      {form}
      name="username"
      label="Username"
      bind:value={$formData.username}
      autocomplete="username"
      placeholder="john"
    />

    <TextField
      {form}
      name="password"
      label="Password"
      type="password"
      bind:value={$formData.password}
      autocomplete="current-password"
      placeholder="········"
    />
  </Card.Content>

  <Card.Footer class="mt-6 flex-col gap-3">
    <Form.Button class="w-full" disabled={$submitting}>
      {$submitting ? "Please wait…" : "Log in"}
    </Form.Button>
  </Card.Footer>
</form>
