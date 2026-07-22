<script lang="ts">
  import { api, imageUrl, type MessageImage, type MessageView } from "$lib/api";
  import Markdown from "$lib/components/markdown/markdown.svelte";
  import { apiErrorMessage } from "$lib/forms";
  import { prepareImage } from "$lib/image";
  import {
    emojiLabel,
    loadEmoji,
    searchEmoji,
    shortcodeQuery,
    type EmojiEntry,
    type EmojiIndex,
  } from "$lib/emoji";
  import { mentionQuery, searchMentions, type MentionSuggestion } from "$lib/mentions";
  import { Button } from "&/button";
  import { Textarea } from "&/textarea";
  import {
    IMAGE_MIME_TYPES,
    MAX_IMAGES_PER_MESSAGE,
    MESSAGE_MAX_LENGTH,
  } from "@ccchat/shared";
  import { Eye, EyeOff, ImagePlus, Reply, Send, X } from "@lucide/svelte";
  import { tick } from "svelte";
  import { toast } from "svelte-sonner";
  import EmojiPicker from "./emoji-picker.svelte";

  interface Props {
    placeholder: string;
    disabled?: boolean;
    onsend: (text: string, imageIds?: string[]) => boolean;
    ontyping?: () => void;
    replyingTo?: MessageView | null;
    oncancelreply?: () => void;
  }

  let {
    placeholder,
    disabled = false,
    onsend,
    ontyping,
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
  let pending = $state<MessageImage[]>([]);
  let uploading = $state(false);
  let fileEl = $state<HTMLInputElement | null>(null);

  type Suggestion =
    { kind: "emoji"; entry: EmojiEntry } | { kind: "mention"; entry: MentionSuggestion };

  let matches = $state<readonly Suggestion[]>([]);
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

  function show(start: number, list: Suggestion[]) {
    if (!list.length) return close();
    anchor = start;
    matches = list;
    active = 0;
  }

  function refresh() {
    if (!el) return;
    const caret = el.selectionStart ?? 0;
    const before = draft.slice(0, caret);

    const at = mentionQuery(before);
    if (at) {
      const hits = searchMentions(at.query);
      return show(
        at.start,
        hits.map((entry) => ({ kind: "mention", entry })),
      );
    }

    const found = shortcodeQuery(before);
    if (!found) return close();
    if (!index) {
      ensureIndex();
      return close();
    }
    const hits = searchEmoji(index, found.query, 10);
    return show(
      found.start,
      hits.map((entry) => ({ kind: "emoji", entry })),
    );
  }

  async function insert(text: string, from: number, to: number) {
    const pos = from + text.length;
    draft = draft.slice(0, from) + text + draft.slice(to);
    close();
    await tick();
    el?.focus();
    el?.setSelectionRange(pos, pos);
  }

  function accept(match: Suggestion) {
    const caret = el?.selectionStart ?? draft.length;
    const text = match.kind === "emoji" ? match.entry[0] : match.entry.token;
    void insert(`${text} `, anchor, caret);
  }

  function insertAtCaret(emoji: string) {
    const from = el?.selectionStart ?? draft.length;
    const to = el?.selectionEnd ?? from;
    void insert(emoji, from, to);
  }

  // Content changing is the only honest signal that someone is writing: focus
  // alone can sit on an empty box all day, and an emptied box is a change of
  // mind, not a message on its way.
  function changed() {
    refresh();
    if (draft.trim()) ontyping?.();
  }

  async function addFiles(files: Iterable<File>) {
    const room = MAX_IMAGES_PER_MESSAGE - pending.length;
    const picked = [...files]
      .filter((f) => IMAGE_MIME_TYPES.includes(f.type))
      .slice(0, room);
    if (!picked.length) return;

    uploading = true;
    try {
      const uploaded = await Promise.all(
        picked.map(
          async (file) => (await api.images.upload(await prepareImage(file))).image,
        ),
      );
      pending = [...pending, ...uploaded];
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to upload image"));
    } finally {
      uploading = false;
    }
  }

  function onpaste(e: ClipboardEvent) {
    const files = [...(e.clipboardData?.items ?? [])]
      .filter((i) => i.kind === "file")
      .map((i) => i.getAsFile())
      .filter((f) => f !== null);
    if (!files.length) return;
    e.preventDefault();
    void addFiles(files);
  }

  function onpick(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    void addFiles(input.files ?? []);
    input.value = "";
  }

  function submit() {
    const text = draft.trim();
    if (!text && !pending.length) return;
    if (
      onsend(
        text,
        pending.map((p) => p.id),
      )
    ) {
      draft = "";
      pending = [];
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

<div class="relative shrink-0 p-2 pt-0 sm:p-4 sm:pt-0">
  {#if open}
    <div
      class="bg-popover text-popover-foreground ring-foreground/10 absolute bottom-full left-2 z-20 mb-1 w-72 overflow-hidden rounded-xl shadow-lg ring-1 sm:left-4"
      role="listbox"
      aria-label="Suggestions"
    >
      {#each matches as match, i (match.kind === "emoji" ? match.entry[1] : match.entry.key)}
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
          onclick={() => accept(match)}
        >
          {#if match.kind === "emoji"}
            <span class="text-lg leading-none">{match.entry[0]}</span>
            <span class="truncate">:{match.entry[1]}:</span>
            <span class="text-muted-foreground ml-auto truncate text-xs">
              {emojiLabel(match.entry[1])}
            </span>
          {:else}
            <span
              class="size-2 shrink-0 rounded-full"
              style="background:{match.entry.color ?? 'var(--muted-foreground)'}"
            ></span>
            <span
              class="truncate font-medium"
              style={match.entry.color ? `color:${match.entry.color}` : undefined}
            >
              {match.entry.label}
            </span>
            <span class="text-muted-foreground ml-auto truncate text-xs">
              {match.entry.detail}
            </span>
          {/if}
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

  {#if pending.length || uploading}
    <div class="mb-2 flex flex-wrap gap-2">
      {#each pending as image (image.id)}
        <div class="relative">
          <img
            src={imageUrl(image.id)}
            alt=""
            class="h-20 w-20 rounded-xl border object-cover"
          />
          <Button
            variant="secondary"
            size="icon-xs"
            class="absolute -top-1.5 -right-1.5 rounded-full"
            title="Remove image"
            onclick={() => (pending = pending.filter((p) => p.id !== image.id))}
          >
            <X class="size-3" />
          </Button>
        </div>
      {/each}
      {#if uploading}
        <div
          class="bg-muted/40 text-muted-foreground flex h-20 w-20 items-center justify-center rounded-xl border text-xs"
        >
          Uploading
        </div>
      {/if}
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
      onpaste={disabled ? undefined : onpaste}
      oninput={changed}
      onclick={refresh}
      onfocus={ensureIndex}
      onblur={close}
    />
    <input
      bind:this={fileEl}
      type="file"
      accept={IMAGE_MIME_TYPES.join(",")}
      multiple
      class="hidden"
      onchange={onpick}
    />
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled || pending.length >= MAX_IMAGES_PER_MESSAGE}
      title="Attach images"
      onclick={() => fileEl?.click()}
    >
      <ImagePlus class="size-4" />
    </Button>
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
