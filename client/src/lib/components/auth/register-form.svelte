<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { register } from "$lib/app";
  import TextField from "$lib/components/common/text-field.svelte";
  import { apiErrorMessage, fail, setError, setMessage, spaForm } from "$lib/forms";
  import * as Card from "&/card";
  import * as Form from "&/form";
  import { registerBody } from "@motus/shared";
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
        const msg = apiErrorMessage(err, m.common_something_went_wrong());
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
      label={m.auth_invite_code_label()}
      bind:value={$formData.inviteCode}
      placeholder={m.auth_invite_code_placeholder()}
      autocomplete="off"
    />

    <TextField
      {form}
      name="username"
      label={m.auth_username_label()}
      bind:value={$formData.username}
      placeholder={m.auth_username_rules_placeholder()}
      autocomplete="username"
    />

    <TextField
      {form}
      name="displayName"
      bind:value={$formData.displayName}
      placeholder={m.auth_display_name_placeholder()}
    >
      {#snippet label()}
        {m.auth_display_name_label()}
        <span class="text-muted-foreground font-normal">{m.common_optional()}</span>
      {/snippet}
    </TextField>

    <TextField
      {form}
      name="password"
      label={m.auth_password_label()}
      type="password"
      bind:value={$formData.password}
      placeholder={m.auth_password_rules_placeholder()}
      autocomplete="new-password"
    />
  </Card.Content>

  <Card.Footer class="mt-6 flex-col gap-3">
    <Form.Button class="w-full" disabled={$submitting}>
      {$submitting ? m.common_please_wait() : m.auth_create_account()}
    </Form.Button>
  </Card.Footer>
</form>
