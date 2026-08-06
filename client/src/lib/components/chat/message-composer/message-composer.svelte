<script lang="ts">
  import { type MessageView } from "$lib/api";
  import Markdown from "$lib/components/markdown/markdown.svelte";
  import { Button } from "&/button";
  import { Textarea } from "&/textarea";
  import { MAX_ATTACHMENTS_PER_MESSAGE, MESSAGE_MAX_LENGTH } from "@motus/shared";
  import { Eye, EyeOff, Paperclip, Send } from "@lucide/svelte";
  import EmojiPicker from "../emoji-picker.svelte";
  import AttachmentChip from "./attachment-chip.svelte";
  import { Composer } from "./composer.svelte";
  import type { ComposerCallbacks } from "./composer.types";
  import ReplyBanner from "./reply-banner.svelte";
  import SuggestionList from "./suggestion-list.svelte";

  interface Props extends ComposerCallbacks {
    placeholder: string;
    disabled?: boolean;
    replyingTo?: MessageView | null;
  }
  const {
    placeholder,
    disabled = false,
    replyingTo = null,
    onsend,
    ontyping,
    oncancelreply,
  }: Props = $props();

  const c = new Composer({
    onsend: (text, ids) => onsend(text, ids),
    ontyping: () => ontyping?.(),
    oncancelreply: () => oncancelreply?.(),
    replyingTo: () => replyingTo,
  });

  export const focus = c.focus;
</script>

<div class="relative shrink-0 p-2 pt-0 sm:p-4 sm:pt-0">
  {#if c.open}
    <SuggestionList
      matches={c.matches}
      active={c.active}
      onhover={(i) => (c.active = i)}
      onaccept={c.accept}
    />
  {/if}

  {#if c.showPreview}
    <div
      class="thin-scrollbar bg-muted/40 mb-2 max-h-40 overflow-y-auto rounded-xl border px-3 py-2"
    >
      <div class="text-muted-foreground mb-1 text-xs font-medium">Preview</div>
      <Markdown content={c.draft} class="text-sm" />
    </div>
  {/if}

  {#if c.pending.length}
    <div class="mb-2 flex flex-wrap gap-2">
      {#each c.pending as item (item.key)}
        <AttachmentChip
          {item}
          ontoggle={() => c.toggleOriginal(item.key)}
          onremove={() => c.removePending(item.key)}
        />
      {/each}
    </div>
  {/if}

  {#if replyingTo}
    <ReplyBanner
      name={replyingTo.author?.displayName ?? "unknown"}
      oncancel={() => oncancelreply?.()}
    />
  {/if}

  <div
    class="bg-input/50 focus-within:border-ring focus-within:ring-ring/30 relative flex items-start gap-0.5 rounded-2xl border border-transparent p-1 transition-[color,box-shadow] duration-200 focus-within:ring-3"
  >
    <Textarea
      bind:ref={c.el}
      bind:value={c.draft}
      {placeholder}
      {disabled}
      rows={1}
      maxlength={MESSAGE_MAX_LENGTH}
      class="thin-scrollbar field-sizing-content max-h-60 min-h-8 flex-1 rounded-none border-0 bg-transparent py-1.5 pl-2 focus-visible:border-transparent focus-visible:ring-0"
      autocomplete="off"
      onkeydown={disabled ? undefined : c.onkeydown}
      onpaste={disabled ? undefined : c.onpaste}
      oninput={c.changed}
      onclick={c.refresh}
      onfocus={c.ensureIndex}
      onblur={c.close}
    />
    <input bind:this={c.fileEl} type="file" multiple class="hidden" onchange={c.onpick} />
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled || c.pending.length >= MAX_ATTACHMENTS_PER_MESSAGE}
      title="Attach files"
      onclick={() => c.fileEl?.click()}
    >
      <Paperclip class="size-4" />
    </Button>
    <Button
      variant="ghost"
      size="icon"
      {disabled}
      title={c.preview ? "Hide preview" : "Show preview"}
      onclick={() => (c.preview = !c.preview)}
    >
      {#if c.preview}<EyeOff class="size-4" />{:else}<Eye class="size-4" />{/if}
    </Button>
    <EmojiPicker {disabled} onpick={c.insertAtCaret} />
    <Button
      size="icon"
      disabled={disabled || c.uploading}
      onclick={c.submit}
      title={c.uploading ? "Waiting for uploads…" : "Send"}
    >
      <Send class="size-4" />
    </Button>

    {#if c.showCount}
      <div
        bind:this={c.countEl}
        class={[
          "pointer-events-none absolute right-3 bottom-1.5 text-xs tabular-nums",
          c.remaining <= 0 ? "text-destructive" : "text-muted-foreground",
        ]}
        aria-live="polite"
      >
        {c.remaining}
      </div>
    {/if}
  </div>
</div>
