<script lang="ts">
  import { api } from "$lib/api";
  import { chat } from "$lib/chat.svelte";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { apiErrorMessage, fail, ok, toastMessage } from "$lib/forms";
  import { changePasswordBody, updateProfileBody } from "@ccchat/shared";
  import {
    defaults,
    setError,
    setMessage,
    superForm,
  } from "sveltekit-superforms";
  import { zod4, zod4Client } from "sveltekit-superforms/adapters";
  import AvatarPicker from "./AvatarPicker.svelte";

  const nameForm = superForm(
    defaults({ displayName: chat.user?.displayName ?? "" }, zod4(updateProfileBody)),
    {
      SPA: true,
      validators: zod4Client(updateProfileBody),
      resetForm: false,
      onUpdate: async ({ form }) => {
        if (!form.valid || !chat.token) return;
        try {
          const { user } = await api.updateProfile(chat.token, form.data);
          chat.patchUser({ displayName: user.displayName });
          setMessage(form, ok("Display name saved."));
        } catch (err) {
          setMessage(form, fail(apiErrorMessage(err, "failed to save")));
        }
      },
      onUpdated: toastMessage,
    },
  );
  const {
    form: nameData,
    enhance: nameEnhance,
    submitting: nameBusy,
  } = nameForm;

  const passwordForm = superForm(
    defaults({ currentPassword: "", newPassword: "" }, zod4(changePasswordBody)),
    {
      SPA: true,
      validators: zod4Client(changePasswordBody),
      // Clear both fields on success.
      resetForm: true,
      onUpdate: async ({ form }) => {
        if (!form.valid || !chat.token) return;
        try {
          await api.changePassword(chat.token, form.data);
          setMessage(form, ok("Password changed."));
        } catch (err) {
          // Stays inline rather than becoming a toast: this one names a field,
          // and a toast can't point at the input you got wrong.
          setError(
            form,
            "currentPassword",
            apiErrorMessage(err, "failed to change password"),
          );
        }
      },
      onUpdated: toastMessage,
    },
  );
  const {
    form: passwordData,
    enhance: passwordEnhance,
    submitting: passwordBusy,
  } = passwordForm;
</script>

<AvatarPicker />

<form method="POST" use:nameEnhance>
  <Form.Field form={nameForm} name="displayName">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Display name</Form.Label>
        <div class="flex gap-2">
          <Input
            {...props}
            bind:value={$nameData.displayName}
            maxlength={32}
            class="flex-1"
          />
          <Form.Button disabled={$nameBusy}>Save</Form.Button>
        </div>
      {/snippet}
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>
</form>

<form method="POST" use:passwordEnhance class="space-y-2">
  <Label>Change password</Label>

  <Form.Field form={passwordForm} name="currentPassword">
    <Form.Control>
      {#snippet children({ props })}
        <Input
          {...props}
          type="password"
          placeholder="current password"
          bind:value={$passwordData.currentPassword}
          autocomplete="current-password"
        />
      {/snippet}
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  <Form.Field form={passwordForm} name="newPassword">
    <Form.Control>
      {#snippet children({ props })}
        <Input
          {...props}
          type="password"
          placeholder="new password (min 8)"
          bind:value={$passwordData.newPassword}
          autocomplete="new-password"
        />
      {/snippet}
    </Form.Control>
    <Form.FieldErrors />
  </Form.Field>

  <Form.Button variant="secondary" disabled={$passwordBusy}>
    Update password
  </Form.Button>
</form>
