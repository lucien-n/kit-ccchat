<script lang="ts">
  import { api } from "$lib/api";
  import CommunityIconPicker from "$lib/components/community/CommunityIconPicker.svelte";
  import { community } from "$lib/stores/community.svelte";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { apiErrorMessage, fail, ok, toastMessage } from "$lib/forms";
  import { renameCommunityBody } from "@ccchat/shared";
  import { defaults, setMessage, superForm } from "sveltekit-superforms";
  import { zod4, zod4Client } from "sveltekit-superforms/adapters";

  const form = superForm(
    defaults({ communityName: community.name }, zod4(renameCommunityBody)),
    {
      SPA: true,
      validators: zod4Client(renameCommunityBody),
      resetForm: false,
      onUpdate: async ({ form }) => {
        if (!form.valid) return;
        try {
          await api.community.rename(form.data.communityName);
          setMessage(form, ok("Community renamed."));
        } catch (err) {
          setMessage(form, fail(apiErrorMessage(err, "failed to save")));
        }
      },
      onUpdated: toastMessage,
    },
  );

  const { form: formData, enhance, submitting } = form;
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
      Shown on the login screen and in the header. Everyone sees the change immediately.
    </Form.Description>
    <Form.FieldErrors />
  </Form.Field>
</form>

<div class="mt-6 space-y-2">
  <p class="text-sm font-medium">Community icon</p>
  <CommunityIconPicker />
</div>
