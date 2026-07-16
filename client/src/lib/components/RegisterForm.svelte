<script lang="ts">
  import { chat } from "$lib/chat.svelte";
  import * as Card from "$lib/components/ui/card";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { apiErrorMessage, fail, toastMessage } from "$lib/forms";
  import { registerBody } from "@ccchat/shared";
  import { untrack } from "svelte";
  import { defaults, setError, setMessage, superForm } from "sveltekit-superforms";
  import { zod4, zod4Client } from "sveltekit-superforms/adapters";

  let { invite = "" }: { invite?: string } = $props();

  const form = superForm(
    defaults(
      {
        inviteCode: untrack(() => invite),
        username: "",
        displayName: "",
        password: "",
      },
      zod4(registerBody),
    ),
    {
      SPA: true,
      validators: zod4Client(registerBody),
      resetForm: false,
      onUpdate: async ({ form }) => {
        if (!form.valid) return;
        try {
          await chat.register(
            form.data.inviteCode,
            form.data.username,
            form.data.password,
            form.data.displayName || undefined,
          );
        } catch (err) {
          const msg = apiErrorMessage(err, "something went wrong");
          if (/invite/i.test(msg)) setError(form, "inviteCode", msg);
          else if (/username/i.test(msg)) setError(form, "username", msg);
          else setMessage(form, fail(msg));
        }
      },
      onUpdated: toastMessage,
    },
  );

  const { form: formData, enhance, submitting } = form;
</script>

<form method="POST" use:enhance>
  <Card.Content class="space-y-4">
    <Form.Field {form} name="inviteCode">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Invite code</Form.Label>
          <Input
            {...props}
            bind:value={$formData.inviteCode}
            placeholder="paste your invite code"
            autocomplete="off"
          />
        {/snippet}
      </Form.Control>
      <Form.FieldErrors />
    </Form.Field>

    <Form.Field {form} name="username">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Username</Form.Label>
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

    <Form.Field {form} name="password">
      <Form.Control>
        {#snippet children({ props })}
          <Form.Label>Password</Form.Label>
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
      {$submitting ? "Please wait…" : "Create account"}
    </Form.Button>
  </Card.Footer>
</form>
