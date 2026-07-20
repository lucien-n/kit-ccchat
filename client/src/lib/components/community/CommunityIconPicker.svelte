<script lang="ts">
  import { api } from "$lib/api";
  import { Button } from "$lib/components/ui/button";
  import { apiErrorMessage } from "$lib/forms";
  import { resizeImage } from "$lib/image";
  import { community } from "$lib/stores/community.svelte";
  import { session } from "$lib/stores/session.svelte";
  import ImageIcon from "@lucide/svelte/icons/image";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Upload from "@lucide/svelte/icons/upload";
  import { toast } from "svelte-sonner";

  let fileInput: HTMLInputElement | null = $state(null);
  let busy = $state(false);

  async function onFile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file || !session.token) return;
    busy = true;
    try {
      const dataUrl = await resizeImage(file, 256);
      const { iconVersion } = await api.setCommunityIcon(session.token, dataUrl);
      community.iconVersion = iconVersion;
      toast.success("Community icon updated.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "upload failed"));
    } finally {
      busy = false;
      if (fileInput) fileInput.value = "";
    }
  }

  async function remove() {
    if (!session.token) return;
    busy = true;
    try {
      await api.removeCommunityIcon(session.token);
      community.iconVersion = null;
    } catch (err) {
      toast.error(apiErrorMessage(err, "failed to remove"));
    } finally {
      busy = false;
    }
  }
</script>

<div class="flex items-center gap-4">
  {#if community.iconUrl}
    <img src={community.iconUrl} alt="" class="size-20 rounded-xl object-cover" />
  {:else}
    <div
      class="bg-muted text-muted-foreground grid size-20 place-items-center rounded-xl"
    >
      <ImageIcon class="size-8" />
    </div>
  {/if}

  <div class="space-y-2">
    <div class="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onclick={() => fileInput?.click()}
      >
        <Upload class="size-4" /> Upload
      </Button>
      {#if community.iconVersion != null}
        <Button variant="ghost" size="sm" disabled={busy} onclick={remove}>
          <Trash2 class="size-4" /> Remove
        </Button>
      {/if}
    </div>
    <p class="text-muted-foreground text-xs">
      Used as the tab icon and shown beside the community name. Square looks best.
    </p>
  </div>

  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    class="hidden"
    onchange={onFile}
  />
</div>
