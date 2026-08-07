<script lang="ts">
  import { m } from "$lib/paraglide/messages";
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
      fallback: m.common_save_failed(),
      onValid: async (data, form) => {
        await api.community.rename(data.communityName);
        setMessage(form, ok(m.community_renamed_toast()));
      },
    },
  );

  const { form: formData, enhance, submitting } = form;
</script>

<form method="POST" use:enhance>
  <Form.Field {form} name="communityName">
    <Form.Control>
      {#snippet children({ props })}
        <Form.Label>{m.setup_community_name_label()}</Form.Label>
        <div class="flex gap-2">
          <Input
            {...props}
            bind:value={$formData.communityName}
            maxlength={60}
            class="flex-1"
          />
          <Form.Button disabled={$submitting}>{m.common_save()}</Form.Button>
        </div>
      {/snippet}
    </Form.Control>
    <Form.Description>{m.community_name_description()}</Form.Description>
    <Form.FieldErrors />
  </Form.Field>
</form>

<div class="mt-6 space-y-2">
  <p class="text-sm font-medium">{m.community_icon_label()}</p>
  <CommunityIconPicker />
</div>
