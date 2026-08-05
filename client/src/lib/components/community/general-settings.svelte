<script lang="ts">
  import { api } from "$lib/api";
  import CommunityIconPicker from "$lib/components/community/community-icon-picker.svelte";
  import { ok, setMessage, spaForm } from "$lib/forms";
  import { community } from "$lib/stores";
  import * as Form from "&/form";
  import { Input } from "&/input";
  import { renameCommunityBody } from "@motus/shared";

  const form = spaForm(
    renameCommunityBody,
    { communityName: community.name },
    {
      fallback: "failed to save",
      onValid: async (data, form) => {
        await api.community.rename(data.communityName);
        setMessage(form, ok("Community renamed."));
      },
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
