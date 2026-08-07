<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import EmojiPicker from "$lib/components/chat/emoji-picker.svelte";
  import { soundboard } from "$lib/stores";
  import { Button } from "&/button";
  import * as Dialog from "&/dialog";
  import { Input } from "&/input";
  import { Label } from "&/label";
  import { MAX_SOUNDBOARD_NAME } from "@motus/shared";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";

  export type DialogMode =
    | { kind: "upload"; file: File; name: string; emoji: string }
    | { kind: "edit"; id: string; name: string; emoji: string };

  interface Props {
    isOpen: boolean;
    mode: DialogMode | null;
  }
  let { isOpen = $bindable(), mode = $bindable() }: Props = $props();

  let formName = $state("");
  let formEmoji = $state("");

  // Seed the form each time a new mode opens the dialog; local edits persist.
  $effect(() => {
    if (mode) {
      formName = mode.name;
      formEmoji = mode.emoji;
    }
  });

  async function confirmDialog() {
    if (!mode) return;
    const emoji = formEmoji || undefined;
    const saved =
      mode.kind === "edit"
        ? await soundboard.update(mode.id, formName, emoji)
        : await soundboard.upload(mode.file, formName, emoji);
    // Keep the dialog open on failure so the error shows and edits aren't lost.
    if (saved) isOpen = false;
  }

  async function deleteSound() {
    if (mode?.kind !== "edit") return;
    await soundboard.remove(mode.id);
    isOpen = false;
  }
</script>

<Dialog.Root
  bind:open={isOpen}
  onOpenChange={(v) => {
    if (!v) mode = null;
  }}
>
  <Dialog.Content class="max-w-sm">
    <Dialog.Header>
      <Dialog.Title>
        {mode?.kind === "edit" ? m.sound_edit_title() : m.sound_add_title()}
      </Dialog.Title>
      <Dialog.Description>{m.sound_dialog_description()}</Dialog.Description>
    </Dialog.Header>

    <div class="flex items-end gap-2">
      <div class="flex flex-col gap-1.5">
        <Label>{m.emoji_picker_title()}</Label>
        <div class="flex items-center">
          <div
            class="bg-muted flex size-9 items-center justify-center rounded-md text-lg leading-none"
          >
            {formEmoji || "🔊"}
          </div>
          <EmojiPicker onpick={(e) => (formEmoji = e)} />
        </div>
      </div>
      <div class="flex flex-1 flex-col gap-1.5">
        <Label for="sound-name">{m.common_name()}</Label>
        <Input
          id="sound-name"
          bind:value={formName}
          maxlength={MAX_SOUNDBOARD_NAME}
          placeholder={m.sound_name_placeholder()}
          autocomplete="off"
        />
      </div>
    </div>

    {#if soundboard.error}
      <div class="text-destructive text-sm">{soundboard.error}</div>
    {/if}

    <Dialog.Footer>
      {#if mode?.kind === "edit"}
        <Button
          type="button"
          variant="ghost"
          class="text-destructive hover:text-destructive sm:mr-auto"
          disabled={soundboard.busy}
          onclick={deleteSound}
        >
          <Trash2Icon class="size-4" />
          {m.common_delete()}
        </Button>
      {/if}
      <Button type="button" variant="ghost" onclick={() => (isOpen = false)}>
        {m.common_cancel()}
      </Button>
      <Button
        type="button"
        disabled={soundboard.busy || !formName.trim()}
        onclick={confirmDialog}
      >
        {#if mode?.kind === "edit"}
          {soundboard.busy ? m.sound_saving() : m.common_save()}
        {:else}
          {soundboard.busy ? m.sound_uploading() : m.sound_add_action()}
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
