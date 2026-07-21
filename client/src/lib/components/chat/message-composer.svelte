<script lang="ts">
  import type { MessageView } from "$lib/api";
  import Markdown from "$lib/components/markdown/markdown.svelte";
  import {
    emojiLabel,
    loadEmoji,
    searchEmoji,
    shortcodeQuery,
    type EmojiEntry,
    type EmojiIndex,
  } from "$lib/emoji";
  import { Button } from "&/button";
  import { Textarea } from "&/textarea";
  import { MESSAGE_MAX_LENGTH } from "@ccchat/shared";
  import { Eye, EyeOff, Reply, Send, X } from "@lucide/svelte";
  import { tick } from "svelte";
  import EmojiPicker from "./emoji-picker.svelte";

  interface Props {
    placeholder: string;
    disabled?: boolean;
    onsend: (text: string) => boolean;
    replyingTo?: MessageView | null;
    oncancelreply?: () => void;
  }

  let {
    placeholder,
    disabled = false,
    onsend,
    replyingTo = null,
    oncancelreply,
  }: Props = $props();

  export function focus() {
    el?.focus();
  }

  let draft = $state("");
  let el = $state<HTMLTextAreaElement | null>(null);
  let index = $state<EmojiIndex | null>(null);
  let preview = $state(false);

  let matches = $state<readonly EmojiEntry[]>([]);
  let active = $state(0);
  let anchor = $state(-1);

  const open = $derived(anchor >= 0 && matches.length > 0);
  const remaining = $derived(MESSAGE_MAX_LENGTH - draft.length);
  const showCount = $derived(remaining <= 200);
  const showPreview = $derived(preview && draft.trim().length > 0);

  function close() {
    anchor = -1;
    matches = [];
    active = 0;
  }

  // The keystroke that starts the load gets no list, so refresh when it lands.
  function ensureIndex() {
    if (index) return;
    void loadEmoji().then((i) => {
      index = i;
      if (el && document.activeElement === el) refresh();
    });
  }

  function refresh() {
    if (!el) return;
    const caret = el.selectionStart ?? 0;
    const found = shortcodeQuery(draft.slice(0, caret));
    if (!found) return close();
    if (!index) {
      ensureIndex();
      return close();
    }
    const hits = searchEmoji(index, found.query, 10);
    if (!hits.length) return close();
    anchor = found.start;
    matches = hits;
    active = 0;
  }

  async function insert(text: string, from: number, to: number) {
    const pos = from + text.length;
    draft = draft.slice(0, from) + text + draft.slice(to);
    close();
    await tick();
    el?.focus();
    el?.setSelectionRange(pos, pos);
  }

  function accept(entry: EmojiEntry) {
    const caret = el?.selectionStart ?? draft.length;
    void insert(`${entry[0]} `, anchor, caret);
  }

  function insertAtCaret(emoji: string) {
    const from = el?.selectionStart ?? draft.length;
    const to = el?.selectionEnd ?? from;
    void insert(emoji, from, to);
  }

  function submit() {
    const text = draft.trim();
    if (!text) return;
    if (onsend(text)) {
      draft = "";
      close();
    }
  }

  function onkeydown(e: KeyboardEvent) {
    if (open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        active = (active + 1) % matches.length;
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        active = (active - 1 + matches.length) % matches.length;
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        accept(matches[active]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
    }
    // Only once the suggestion list above has had its chance at Escape.
    if (e.key === "Escape" && replyingTo) {
      e.preventDefault();
      oncancelreply?.();
      return;
    }
    // isComposing: mid-IME, Enter commits a candidate rather than sending.
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      submit();
    }
  }
</script>

<div class="relative shrink-0 p-2 sm:p-4">
  {#if open}
    <div
      class="bg-popover text-popover-foreground ring-foreground/10 absolute bottom-full left-2 z-20 mb-1 w-72 overflow-hidden rounded-xl shadow-lg ring-1 sm:left-4"
      role="listbox"
      aria-label="Emoji suggestions"
    >
      {#each matches as entry, i (entry[1])}
        <button
          type="button"
          role="option"
          aria-selected={i === active}
          class="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm {i ===
          active
            ? 'bg-accent text-accent-foreground'
            : ''}"
          onmousemove={() => (active = i)}
          onmousedown={(e) => e.preventDefault()}
          onclick={() => accept(entry)}
        >
          <span class="text-lg leading-none">{entry[0]}</span>
          <span class="truncate">:{entry[1]}:</span>
          <span class="text-muted-foreground ml-auto truncate text-xs">
            {emojiLabel(entry[1])}
          </span>
        </button>
      {/each}
    </div>
  {/if}

  {#if showPreview}
    <div
      class="thin-scrollbar bg-muted/40 mb-2 max-h-40 overflow-y-auto rounded-xl border px-3 py-2"
    >
      <div class="text-muted-foreground mb-1 text-xs font-medium">Preview</div>
      <Markdown content={draft} class="text-sm" />
    </div>
  {/if}

  {#if replyingTo}
    <div
      class="bg-muted/40 text-muted-foreground mb-2 flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs"
    >
      <Reply class="size-3.5 shrink-0" />
      <span class="shrink-0">Replying to</span>
      <span class="text-foreground min-w-0 truncate font-medium">
        {replyingTo.author?.displayName ?? "unknown"}
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        class="ml-auto shrink-0"
        title="Cancel reply"
        onclick={() => oncancelreply?.()}
      >
        <X class="size-3.5" />
      </Button>
    </div>
  {/if}

  {#if showCount}
    <div
      class="text-muted-foreground absolute -top-1 right-4 text-xs sm:right-6"
      class:text-destructive={remaining <= 0}
      aria-live="polite"
    >
      {remaining}
    </div>
  {/if}

  <!-- The box owns the border and focus ring so the textarea and buttons read
       as one control; the textarea's own ring is turned off below. -->
  <div
    class="bg-input/50 focus-within:border-ring focus-within:ring-ring/30 flex items-end gap-0.5 rounded-2xl border border-transparent p-1 transition-[color,box-shadow] duration-200 focus-within:ring-3"
  >
    <Textarea
      bind:ref={el}
      bind:value={draft}
      {placeholder}
      {disabled}
      rows={1}
      maxlength={MESSAGE_MAX_LENGTH}
      class="thin-scrollbar field-sizing-content max-h-60 min-h-8 flex-1 rounded-none border-0 bg-transparent py-1.5 pl-2 focus-visible:border-transparent focus-visible:ring-0"
      autocomplete="off"
      onkeydown={disabled ? undefined : onkeydown}
      oninput={refresh}
      onclick={refresh}
      onfocus={ensureIndex}
      onblur={close}
    />
    <Button
      variant="ghost"
      size="icon"
      {disabled}
      title={preview ? "Hide preview" : "Show preview"}
      onclick={() => (preview = !preview)}
    >
      {#if preview}<EyeOff class="size-4" />{:else}<Eye class="size-4" />{/if}
    </Button>
    <EmojiPicker {disabled} onpick={insertAtCaret} />
    <Button size="icon" {disabled} onclick={submit} title="Send">
      <Send class="size-4" />
    </Button>
  </div>
</div>
