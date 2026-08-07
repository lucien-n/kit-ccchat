<script lang="ts">
  import { m } from "$lib/paraglide/messages";
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
        setMessage(form, ok(m.profile_password_changed()));
      },
      // Stays inline rather than becoming a toast: this one names a field,
      // and a toast can't point at the input you got wrong.
      onError: (err, form) =>
        setError(
          form,
          "currentPassword",
          apiErrorMessage(err, m.profile_change_password_failed()),
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
      <Label>{m.profile_change_password()}</Label>

      <TextField
        form={passwordForm}
        name="currentPassword"
        type="password"
        placeholder={m.profile_current_password_placeholder()}
        bind:value={$passwordData.currentPassword}
        autocomplete="current-password"
      />

      <TextField
        form={passwordForm}
        name="newPassword"
        type="password"
        placeholder={m.profile_new_password_placeholder()}
        bind:value={$passwordData.newPassword}
        autocomplete="new-password"
      />

      <Form.Button variant="secondary" disabled={$passwordBusy}>
        {m.profile_update_password()}
      </Form.Button>
    </form>

    <Button
      variant="destructive"
      class="w-full shrink-0"
      title={m.profile_log_out_title()}
      onclick={logout}
    >
      <LogOutIcon class="size-4" />
      {m.profile_log_out()}
    </Button>
  </div>

  {#if session.user}
    <Card class="h-fit w-full p-0 sm:w-72 sm:shrink-0">
      <UserCardContent userId={session.user.id} editable />
    </Card>
  {/if}
</div>
