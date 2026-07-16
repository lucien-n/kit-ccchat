<script lang="ts">
  import { api, avatarUrl } from "$lib/api";
  import { chat } from "$lib/chat.svelte";
  import * as Avatar from "$lib/components/ui/avatar";
  import { Button } from "$lib/components/ui/button";
  import { apiErrorMessage } from "$lib/forms";
  import { resizeImage } from "$lib/image";
  import { Trash2, Upload } from "@lucide/svelte";

  // Not a form: a file picker that uploads on change, so it keeps its own state.
  let error = $state("");
  let fileInput: HTMLInputElement | null = $state(null);

  const initial = $derived((chat.user?.displayName ?? "?")[0]?.toUpperCase() ?? "?");
  const avatar = $derived(avatarUrl(chat.user?.id ?? "", chat.user?.avatarVersion));

  async function onFile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file || !chat.token) return;
    error = "";
    try {
      const dataUrl = await resizeImage(file, 256);
      const { avatarVersion } = await api.uploadAvatar(chat.token, dataUrl);
      chat.patchUser({ avatarVersion });
    } catch (err) {
      error = apiErrorMessage(err, "upload failed");
    } finally {
      if (fileInput) fileInput.value = "";
    }
  }

  async function remove() {
    if (!chat.token) return;
    await api.removeAvatar(chat.token).catch(() => {});
    chat.patchUser({ avatarVersion: null });
  }
</script>

<div class="flex items-center gap-4">
  <Avatar.Root class="size-20">
    {#if avatar}<Avatar.Image src={avatar} alt="avatar" />{/if}
    <Avatar.Fallback class="bg-primary text-primary-foreground text-xl">
      {initial}
    </Avatar.Fallback>
  </Avatar.Root>

  <div class="space-y-2">
    <div class="flex gap-2">
      <Button variant="outline" size="sm" onclick={() => fileInput?.click()}>
        <Upload class="size-4" /> Upload
      </Button>
      {#if chat.user?.avatarVersion}
        <Button variant="ghost" size="sm" onclick={remove}>
          <Trash2 class="size-4" /> Remove
        </Button>
      {/if}
    </div>
    <p class="text-muted-foreground text-xs">
      JPG, PNG, GIF or WebP. Square looks best.
    </p>
    {#if error}<p class="text-destructive text-xs">{error}</p>{/if}
  </div>

  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    class="hidden"
    onchange={onFile}
  />
</div>
