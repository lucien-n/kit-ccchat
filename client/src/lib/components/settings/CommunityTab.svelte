<script lang="ts">
  import { api } from "$lib/api";
  import { chat } from "$lib/chat.svelte";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { apiErrorMessage } from "$lib/forms";
  import { renameCommunityBody } from "@ccchat/shared";
  import {
    defaults,
    setError,
    setMessage,
    superForm,
  } from "sveltekit-superforms";
  import { zod4, zod4Client } from "sveltekit-superforms/adapters";

  const form = superForm(
    defaults({ communityName: chat.serverName }, zod4(renameCommunityBody)),
    {
      SPA: true,
      validators: zod4Client(renameCommunityBody),
      resetForm: false,
      onUpdate: async ({ form }) => {
        if (!form.valid || !chat.token) return;
        try {
          await api.renameCommunity(chat.token, form.data.communityName);
          setMessage(form, "Saved.");
        } catch (err) {
          setError(form, "communityName", apiErrorMessage(err, "failed to save"));
        }
      },
    },
  );

  const { form: formData, enhance, submitting, message } = form;
</script>

<form method="POST" use:enhance>
  <Form.Field {form} name="communityName">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>Community name</Form.Label>
        <div class="flex gap-2">
          <Input
            {...props}
            bind:value={$formData.communityName}
            maxlength={60}
            class="flex-1"
          />
          <Form.Button disabled={$submitting}>Save</Form.Button>
        </div>
      {/snippet}
    </Form.Control>
    <Form.Description>
      Shown on the login screen and in the header. Everyone sees the change
      immediately.
    </Form.Description>
    <Form.FieldErrors />
  </Form.Field>
  {#if $message}<p class="text-muted-foreground text-xs">{$message}</p>{/if}
</form>
