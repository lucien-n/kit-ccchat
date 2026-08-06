<script lang="ts">
  import { api } from "$lib/api";
  import { logout } from "$lib/app";
  import TextField from "$lib/components/common/text-field.svelte";
  import UserCardContent from "$lib/components/common/user-card/user-card-content.svelte";
  import { apiErrorMessage, ok, setError, setMessage, spaForm } from "$lib/forms";
  import { session } from "$lib/stores";
  import { Button } from "&/button";
  import { Card } from "&/card";
  import * as Form from "&/form";
  import { Label } from "&/label";
  import { changePasswordBody } from "@motus/shared";
  import LogOutIcon from "@lucide/svelte/icons/log-out";

  const passwordForm = spaForm(
    changePasswordBody,
    { currentPassword: "", newPassword: "" },
    {
      resetForm: true,
      onValid: async (data, form) => {
        await api.users.changePassword(data);
        setMessage(form, ok("Password changed."));
      },
      // Stays inline rather than becoming a toast: this one names a field,
      // and a toast can't point at the input you got wrong.
      onError: (err, form) =>
        setError(
          form,
          "currentPassword",
          apiErrorMessage(err, "failed to change password"),
        ),
    },
  );
  const {
    form: passwordData,
    enhance: passwordEnhance,
    submitting: passwordBusy,
  } = passwordForm;
</script>

<div class="flex flex-col gap-8 sm:flex-row sm:gap-10">
  <div class="flex-1 space-y-6 sm:min-w-0">
    <form method="POST" use:passwordEnhance class="space-y-2">
      <Label>Change password</Label>

      <TextField
        form={passwordForm}
        name="currentPassword"
        type="password"
        placeholder="current password"
        bind:value={$passwordData.currentPassword}
        autocomplete="current-password"
      />

      <TextField
        form={passwordForm}
        name="newPassword"
        type="password"
        placeholder="new password (min 8)"
        bind:value={$passwordData.newPassword}
        autocomplete="new-password"
      />

      <Form.Button variant="secondary" disabled={$passwordBusy}>
        Update password
      </Form.Button>
    </form>

    <Button
      variant="destructive"
      class="w-full shrink-0"
      title="Log out"
      onclick={logout}
    >
      <LogOutIcon class="size-4" />
      Log Out
    </Button>
  </div>

  {#if session.user}
    <Card class="h-fit w-full p-0 sm:w-72 sm:shrink-0">
      <UserCardContent userId={session.user.id} editable />
    </Card>
  {/if}
</div>
