<script lang="ts">
  import { api } from "$lib/api";
  import { attempt } from "$lib/forms";
  import { resizeImage } from "$lib/image";
  import { community } from "$lib/stores";
  import { Button } from "&/button";
  import ImageIcon from "@lucide/svelte/icons/image";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import Upload from "@lucide/svelte/icons/upload";

  let fileInput: HTMLInputElement | null = $state(null);
  let busy = $state(false);

  async function onFile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    busy = true;
    await attempt(
      async () => {
        const dataUrl = await resizeImage(file, 256);
        const { iconVersion } = await api.community.setIcon(dataUrl);
        community.iconVersion = iconVersion;
      },
      { error: "upload failed", success: "Community icon updated." },
    );
    busy = false;
    if (fileInput) fileInput.value = "";
  }

  async function remove() {
    busy = true;
    await attempt(
      async () => {
        await api.community.removeIcon();
        community.iconVersion = null;
      },
      { error: "failed to remove" },
    );
    busy = false;
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
