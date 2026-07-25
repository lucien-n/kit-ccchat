<script lang="ts">
  import { soundUrl } from "$lib/api";
  import { session } from "$lib/stores/session.svelte";
  import { nameFromFile, soundboard } from "$lib/stores/soundboard.svelte";
  import { voice } from "$lib/stores/voice.svelte";
  import { Button } from "&/button";
  import { Input } from "&/input";
  import * as Popover from "&/popover";
  import { ScrollArea } from "&/scroll-area";
  import type { Sound } from "@ccchat/shared";
  import MegaphoneIcon from "@lucide/svelte/icons/megaphone";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import StarIcon from "@lucide/svelte/icons/star";
  import UploadIcon from "@lucide/svelte/icons/upload";
  import SetSoundDialog, { type DialogMode } from "./set-sound-dialog.svelte";

  let isOpen = $state(false);
  let query = $state("");
  let fileInput = $state<HTMLInputElement>();

  let isDialogOpen = $state(false);
  let mode = $state<DialogMode | null>(null);

  $effect(() => {
    // Refresh on every open so newly uploaded clips from others show up.
    if (isOpen) void soundboard.load();
  });

  const results = $derived(soundboard.search(query));
  const favorites = $derived(query.trim() ? [] : soundboard.favoriteSounds);

  function play(id: string) {
    void voice.playSound(soundUrl(id));
  }

  function openDialog() {
    soundboard.error = "";
    isOpen = false; // close the picker popover so the dialog is unobstructed
    isDialogOpen = true;
  }

  function onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    mode = { kind: "upload", file, name: nameFromFile(file.name), emoji: "" };
    openDialog();
  }

  function editSound(sound: Sound) {
    mode = { kind: "edit", id: sound.id, name: sound.name, emoji: sound.emoji ?? "" };
    openDialog();
  }
</script>

<Popover.Root bind:open={isOpen}>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="secondary" size="icon" title="Soundboard">
        <MegaphoneIcon class="size-4" />
      </Button>
    {/snippet}
  </Popover.Trigger>

  <Popover.Content align="end" side="top" class="w-80 gap-2 p-2">
    <div class="flex gap-1.5">
      <Input bind:value={query} placeholder="Search sounds" autocomplete="off" />
      <Button
        variant="secondary"
        size="icon"
        title="Upload a sound"
        onclick={() => fileInput?.click()}
      >
        <UploadIcon class="size-4" />
      </Button>
      <input
        bind:this={fileInput}
        type="file"
        accept="audio/*"
        class="hidden"
        onchange={onFile}
      />
    </div>

    {#if soundboard.error}
      <div class="text-destructive px-1 text-xs">{soundboard.error}</div>
    {/if}

    <ScrollArea class="h-56">
      <div class="flex flex-col gap-2 pr-2">
        {#if favorites.length}
          <div class="text-muted-foreground px-1 text-xs font-medium">Favorites</div>
          <div class="grid grid-cols-2 gap-1">
            {#each favorites as sound (sound.id)}
              {@render tile(sound)}
            {/each}
          </div>
          <div class="text-muted-foreground px-1 text-xs font-medium">All sounds</div>
        {/if}

        {#if results.length}
          <div class="grid grid-cols-2 gap-1">
            {#each results as sound (sound.id)}
              {@render tile(sound)}
            {/each}
          </div>
        {:else if soundboard.loading}
          <div class="text-muted-foreground py-8 text-center text-sm">
            Loading sounds…
          </div>
        {:else if query.trim()}
          <div class="text-muted-foreground py-8 text-center text-sm">
            No sound matches "{query.trim()}"
          </div>
        {:else}
          <div class="text-muted-foreground py-8 text-center text-sm">
            No sounds yet — upload one to get started.
          </div>
        {/if}
      </div>
    </ScrollArea>
  </Popover.Content>
</Popover.Root>

<SetSoundDialog bind:isOpen={isDialogOpen} bind:mode />

{#snippet tile(sound: Sound)}
  <div class="group hover:bg-accent relative flex items-center rounded-md">
    <button
      type="button"
      class="flex min-w-0 flex-1 items-center gap-2 rounded-md p-2 text-left"
      title={sound.name}
      onclick={() => play(sound.id)}
    >
      <span class="text-base leading-none">{sound.emoji ?? "🔊"}</span>
      <span class="truncate text-sm">{sound.name}</span>
    </button>
    <div class="flex shrink-0 items-center pr-1">
      <button
        type="button"
        class="hover:text-foreground text-muted-foreground rounded p-1"
        title={soundboard.isFavorite(sound.id) ? "Unfavorite" : "Favorite"}
        onclick={() => soundboard.toggleFavorite(sound.id)}
      >
        <StarIcon
          class="size-3.5 {soundboard.isFavorite(sound.id)
            ? 'fill-yellow-400 text-yellow-400'
            : ''}"
        />
      </button>
      {#if sound.uploaderId === session.user?.id}
        <button
          type="button"
          class="hover:text-foreground text-muted-foreground rounded p-1 opacity-0 group-hover:opacity-100"
          title="Edit sound"
          onclick={() => editSound(sound)}
        >
          <PencilIcon class="size-3.5" />
        </button>
      {/if}
    </div>
  </div>
{/snippet}
