<script lang="ts">
  import { api } from "$lib/api";
  import UserAvatar from "$lib/components/common/user-avatar.svelte";
  import { apiErrorMessage } from "$lib/forms";
  import { resizeImage } from "$lib/image";
  import { session } from "$lib/stores/session.svelte";
  import { Button } from "&/button";
  import { Trash2, Upload } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  let fileInput: HTMLInputElement | null = $state(null);

  async function onFile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 256);
      const { avatarVersion } = await api.users.setAvatar(dataUrl);
      session.patchUser({ avatarVersion });
    } catch (err) {
      toast.error(apiErrorMessage(err, "upload failed"));
    } finally {
      if (fileInput) fileInput.value = "";
    }
  }

  async function remove() {
    await api.users.removeAvatar().catch(() => {});
    session.patchUser({ avatarVersion: null });
  }
</script>

<div class="flex items-center gap-4">
  <UserAvatar user={session.user} class="size-20" fallbackClass="text-xl" />

  <div class="space-y-2">
    <div class="flex gap-2">
      <Button variant="outline" size="sm" onclick={() => fileInput?.click()}>
        <Upload class="size-4" /> Upload
      </Button>
      {#if session.user?.avatarVersion}
        <Button variant="ghost" size="sm" onclick={remove}>
          <Trash2 class="size-4" /> Remove
        </Button>
      {/if}
    </div>
    <p class="text-muted-foreground text-xs">JPG, PNG, GIF or WebP. Square looks best.</p>
  </div>

  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    class="hidden"
    onchange={onFile}
  />
</div>
