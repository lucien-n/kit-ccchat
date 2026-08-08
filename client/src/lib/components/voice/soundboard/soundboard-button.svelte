<script lang="ts">
  import { soundUrl } from "$lib/api";
  import { m } from "$lib/paraglide/messages";
  import { nameFromFile, session, soundboard, voice } from "$lib/stores";
  import { Button } from "&/button";
  import * as Empty from "&/empty";
  import { Input } from "&/input";
  import * as Popover from "&/popover";
  import { ScrollArea } from "&/scroll-area";
  import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
  import MegaphoneIcon from "@lucide/svelte/icons/megaphone";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import StarIcon from "@lucide/svelte/icons/star";
  import UploadIcon from "@lucide/svelte/icons/upload";
  import Volume2Icon from "@lucide/svelte/icons/volume-2";
  import VolumeXIcon from "@lucide/svelte/icons/volume-x";
  import type { Sound } from "@motus/shared";
  import { untrack } from "svelte";
  import SetSoundDialog, { type DialogMode } from "./set-sound-dialog.svelte";

  interface Props {
    class?: string;
  }
  const { class: className }: Props = $props();

  let isOpen = $state(false);
  let query = $state("");
  let fileInput = $state<HTMLInputElement>();

  let isDialogOpen = $state(false);
  let mode = $state<DialogMode | null>(null);

  $effect(() => {
    if (!isOpen) return;

    untrack(() => soundboard.load());
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

  function handleFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
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
      <Button
        {...props}
        variant="secondary"
        size="icon"
        title={m.soundboard_title()}
        class={className}
      >
        <MegaphoneIcon class="size-4" />
      </Button>
    {/snippet}
  </Popover.Trigger>

  <Popover.Content align="end" side="top" class="w-80 gap-2 p-2">
    <div class="flex gap-1.5">
      <Input bind:value={query} placeholder={m.soundboard_search()} autocomplete="off" />
      <Button
        variant="secondary"
        size="icon"
        title={m.soundboard_upload()}
        onclick={() => fileInput?.click()}
      >
        <UploadIcon class="size-4" />
      </Button>
      <input
        bind:this={fileInput}
        type="file"
        accept="audio/*"
        class="hidden"
        onchange={handleFile}
      />
    </div>

    {#if soundboard.error}
      <div class="text-destructive px-1 text-xs">{soundboard.error}</div>
    {/if}

    <ScrollArea class="h-56">
      <div class="flex flex-col gap-2 pr-2">
        {#if favorites.length}
          <div class="text-muted-foreground px-1 text-xs font-medium">
            {m.soundboard_favorites()}
          </div>
          <div class="grid grid-cols-2 gap-1">
            {#each favorites as sound (sound.id)}
              {@render tile(sound)}
            {/each}
          </div>
          <div class="text-muted-foreground px-1 text-xs font-medium">
            {m.soundboard_all()}
          </div>
        {/if}

        {#if results.length}
          <div class="grid grid-cols-2 gap-1">
            {#each results as sound (sound.id)}
              {@render tile(sound)}
            {/each}
          </div>
        {:else if soundboard.loading}
          <div
            class="text-muted-foreground flex flex-col items-center justify-center gap-3 py-8 text-sm"
          >
            {m.soundboard_loading()}
            <LoaderCircleIcon class="animate-spin" />
          </div>
        {:else if query.trim()}
          <div class="text-muted-foreground py-8 text-center text-sm">
            {m.soundboard_no_match({ query: query.trim() })}
          </div>
        {:else}
          <Empty.Root>
            <Empty.Header>
              <Empty.Title>{m.soundboard_empty_title()}</Empty.Title>
              <Empty.Description>{m.soundboard_empty_desc()}</Empty.Description>
            </Empty.Header>
            <Empty.Content>
              <Button variant="outline" onclick={() => fileInput?.click()}>
                <UploadIcon class="size-4" />
                {m.soundboard_upload_action()}
              </Button>
            </Empty.Content>
          </Empty.Root>
        {/if}
      </div>
    </ScrollArea>

    <div class="flex items-center gap-2 border-t px-1 pt-2">
      {#if soundboard.volume === 0}
        <VolumeXIcon class="text-muted-foreground size-4 shrink-0" />
      {:else}
        <Volume2Icon class="text-muted-foreground size-4 shrink-0" />
      {/if}
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={soundboard.volume}
        oninput={(e) => soundboard.setVolume(e.currentTarget.valueAsNumber)}
        style="--fill: {soundboard.volume * 100}%"
        class="soundboard-volume w-full cursor-pointer"
        title={m.soundboard_volume()}
        aria-label={m.soundboard_volume()}
      />
    </div>
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
        title={soundboard.isFavorite(sound.id)
          ? m.soundboard_unfavorite()
          : m.soundboard_favorite()}
        onclick={() => soundboard.toggleFavorite(sound.id)}
      >
        <StarIcon
          class="size-3.5 {soundboard.isFavorite(sound.id)
            ? 'fill-yellow-400 text-yellow-400'
            : ''}"
        />
      </button>
      {#if sound.uploaderId === session.user?.id || session.isAdmin}
        <button
          type="button"
          class="hover:text-foreground text-muted-foreground rounded p-1 opacity-0 group-hover:opacity-100"
          title={m.sound_edit_title()}
          onclick={() => editSound(sound)}
        >
          <PencilIcon class="size-3.5" />
        </button>
      {/if}
    </div>
  </div>
{/snippet}

<style>
  /* Native range styled to the theme, matching the stream-volume slider. */
  .soundboard-volume {
    height: 0.25rem;
    appearance: none;
    -webkit-appearance: none;
    border-radius: 9999px;
    /* Fill the track up to the thumb so it reads as a level, not a bare value. */
    background: linear-gradient(
      to right,
      var(--primary) var(--fill, 0%),
      var(--muted) var(--fill, 0%)
    );
  }
  /* Firefox paints its own progress under the thumb; keep it in step. */
  .soundboard-volume::-moz-range-progress {
    height: 0.25rem;
    border-radius: 9999px;
    background: var(--primary);
  }
  .soundboard-volume::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 0.75rem;
    width: 0.75rem;
    border-radius: 9999px;
    background: var(--primary);
  }
  .soundboard-volume::-moz-range-thumb {
    height: 0.75rem;
    width: 0.75rem;
    border: none;
    border-radius: 9999px;
    background: var(--primary);
  }
</style>
