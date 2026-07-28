<script lang="ts">
  import { api, bannerUrl } from "$lib/api";
  import { apiErrorMessage } from "$lib/forms";
  import { resizeBanner } from "$lib/image";
  import { session } from "$lib/stores/session.svelte";
  import { Button } from "&/button";
  import { Trash2, Upload } from "@lucide/svelte";
  import { toast } from "svelte-sonner";

  let fileInput: HTMLInputElement | null = $state(null);

  const src = $derived(
    session.user ? bannerUrl(session.user.id, session.user.bannerVersion) : null,
  );

  async function onFile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeBanner(file);
      const { bannerVersion } = await api.users.setBanner(dataUrl);
      session.patchUser({ bannerVersion });
    } catch (err) {
      toast.error(apiErrorMessage(err, "upload failed"));
    } finally {
      if (fileInput) fileInput.value = "";
    }
  }

  async function remove() {
    await api.users.removeBanner().catch(() => {});
    session.patchUser({ bannerVersion: null });
  }
</script>

<div class="space-y-2">
  <div
    class="bg-muted relative flex h-20 w-full items-center justify-center overflow-hidden rounded-2xl"
  >
    {#if src}
      <img class="h-full w-full object-cover" {src} alt="banner" />
    {/if}
  </div>

  <div class="flex items-center gap-2">
    <Button variant="outline" size="sm" onclick={() => fileInput?.click()}>
      <Upload class="size-4" /> Upload banner
    </Button>
    {#if session.user?.bannerVersion}
      <Button variant="ghost" size="sm" onclick={remove}>
        <Trash2 class="size-4" /> Remove
      </Button>
    {/if}
    <p class="text-muted-foreground text-xs">JPG, PNG, GIF or WebP. Wide looks best.</p>
  </div>

  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    class="hidden"
    onchange={onFile}
  />
</div>
