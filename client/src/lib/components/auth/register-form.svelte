<script lang="ts">
  import { register } from "$lib/app";
  import TextField from "$lib/components/common/text-field.svelte";
  import { apiErrorMessage, fail, setError, setMessage, spaForm } from "$lib/forms";
  import * as Card from "&/card";
  import * as Form from "&/form";
  import { Input } from "&/input";
  import { registerBody } from "@ccchat/shared";
  import { untrack } from "svelte";

  let { invite = "" }: { invite?: string } = $props();

  const form = spaForm(
    registerBody,
    {
      inviteCode: untrack(() => invite),
      username: "",
      displayName: "",
      password: "",
    },
    {
      onValid: (data) => register(data),
      onError: (err, form) => {
        const msg = apiErrorMessage(err, "something went wrong");
        if (/invite/i.test(msg)) setError(form, "inviteCode", msg);
        else if (/username/i.test(msg)) setError(form, "username", msg);
        else setMessage(form, fail(msg));
      },
    },
  );

  const { form: formData, enhance, submitting } = form;
</script>

<form method="POST" use:enhance>
  <Card.Content class="space-y-4">
    <TextField
      {form}
      name="inviteCode"
      label="Invite code"
      bind:value={$formData.inviteCode}
      placeholder="paste your invite code"
      autocomplete="off"
    />

    <TextField
      {form}
      name="username"
      label="Username"
      bind:value={$formData.username}
      placeholder="lowercase, 2–24 chars"
      autocomplete="username"
    />

    <Form.Field {form} name="displayName">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>
            Display name
            <span class="text-muted-foreground font-normal">(optional)</span>
          </Form.Label>
          <Input
            {...props}
            bind:value={$formData.displayName}
            placeholder="how others see you"
          />
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>

    <TextField
      {form}
      name="password"
      label="Password"
      type="password"
      bind:value={$formData.password}
      placeholder="at least 8 characters"
      autocomplete="new-password"
    />
  </Card.Content>

  <Card.Footer class="mt-6 flex-col gap-3">
    <Form.Button class="w-full" disabled={$submitting}>
      {$submitting ? "Please wait…" : "Create account"}
    </Form.Button>
  </Card.Footer>
</form>
