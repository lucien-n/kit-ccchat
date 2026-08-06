<script lang="ts">
  import { api, attachmentUrl, type MessageAttachment, type MessageView } from "$lib/api";
  import Markdown from "$lib/components/markdown/markdown.svelte";
  import { apiErrorMessage } from "$lib/forms";
  import { formatBytes } from "$lib/format";
  import { isCompressibleImageType, isImageType } from "$lib/image";
  import { isRejectedAtLimit, shakeAtLimit } from "$lib/length";
  import {
    emojiLabel,
    loadEmoji,
    searchEmoji,
    shortcodeQuery,
    type EmojiEntry,
    type EmojiIndex,
  } from "$lib/emoji";
  import { mentionQuery, searchMentions, type MentionSuggestion } from "$lib/mentions";
  import { appearance } from "$lib/stores";
  import { Button } from "&/button";
  import { Textarea } from "&/textarea";
  import {
    isAudioType,
    MAX_ATTACHMENTS_PER_MESSAGE,
    MESSAGE_MAX_LENGTH,
  } from "@motus/shared";
  import {
    Eye,
    EyeOff,
    File as FileIcon,
    Paperclip,
    Reply,
    Send,
    Sparkles,
    X,
  } from "@lucide/svelte";
  import { tick } from "svelte";
  import { toast } from "svelte-sonner";
  import EmojiPicker from "./emoji-picker.svelte";
  import AudioEmbed from "./message/audio-embed.svelte";

  interface Props {
    placeholder: string;
    disabled?: boolean;
    onsend: (text: string, attachmentIds?: string[]) => boolean;
    ontyping?: () => void;
    replyingTo?: MessageView | null;
    oncancelreply?: () => void;
  }

  /** A file the composer is uploading or has uploaded, before it is bound to a
   *  sent message. `attachment` is null until the upload finishes; `controller`
   *  aborts the in-flight request when the chip is removed or its quality toggled.
   *  The original `file` is kept so a toggle can re-upload it. */
  interface Pending {
    key: string;
    file: File;
    keepOriginal: boolean;
    progress: number;
    attachment: MessageAttachment | null;
    controller: AbortController | null;
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
  let countEl = $state<HTMLElement | null>(null);
  let index = $state<EmojiIndex | null>(null);
  let preview = $state(false);
  let pending = $state<Pending[]>([]);
  let fileEl = $state<HTMLInputElement | null>(null);

  const uploading = $derived(pending.some((p) => !p.attachment));

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

  function addFiles(files: Iterable<File>) {
    const room = MAX_ATTACHMENTS_PER_MESSAGE - pending.length;
    for (const file of [...files].slice(0, room)) {
      const key = crypto.randomUUID();
      pending = [
        ...pending,
        {
          key,
          file,
          keepOriginal: false,
          progress: 0,
          attachment: null,
          controller: null,
        },
      ];
      void uploadOne(file, key, false);
    }
  }

  async function uploadOne(file: File, key: string, keepOriginal: boolean) {
    const controller = new AbortController();
    patchPending(key, { controller, attachment: null, progress: 0 });

    try {
      const attachment = await api.attachments.upload(file, {
        keepOriginal,
        signal: controller.signal,
        onProgress: (frac) => {
          // The bar only renders whole percents; skip ticks that wouldn't move it.
          const p = pending.find((p) => p.key === key);
          if (p && Math.round(frac * 100) !== Math.round(p.progress * 100))
            patchPending(key, { progress: frac });
        },
      });
      // A later toggle or removal may have superseded this upload - ignore its result.
      const p = pending.find((p) => p.key === key);
      if (!p || p.controller !== controller) return;
      patchPending(key, { attachment, controller: null });
    } catch (e) {
      // A toggle/removal aborts the request on purpose, so stay silent for that.
      if (e instanceof DOMException && e.name === "AbortError") return;
      const p = pending.find((p) => p.key === key);
      if (p && p.controller === controller) removePending(key);
      toast.error(apiErrorMessage(e, "failed to upload attachment"));
    }
  }

  /** Re-upload an image at the opposite quality, cancelling the in-flight request.
   *  Only offered for compressible images (animated/other files are always sent
   *  as-is). */
  function toggleOriginal(key: string) {
    const p = pending.find((p) => p.key === key);
    if (!p) return;
    p.controller?.abort();
    const keepOriginal = !p.keepOriginal;
    patchPending(key, { keepOriginal, attachment: null, progress: 0, controller: null });
    void uploadOne(p.file, key, keepOriginal);
  }

  function patchPending(key: string, changes: Partial<Pending>) {
    pending = pending.map((p) => (p.key === key ? { ...p, ...changes } : p));
  }

  function removePending(key: string) {
    pending.find((p) => p.key === key)?.controller?.abort();
    pending = pending.filter((p) => p.key !== key);
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
    if (uploading) return; // let in-flight uploads finish before sending
    const text = draft.trim();
    const ready = pending.filter((p) => p.attachment);
    if (!text && !ready.length) return;
    if (
      onsend(
        text,
        ready.map((p) => p.attachment!.id),
      )
    ) {
      draft = "";
      pending = [];
      close();
    }
  }

  function onkeydown(e: KeyboardEvent) {
    if (isRejectedAtLimit(e, remaining <= 0))
      shakeAtLimit(countEl, appearance.motionReduced);

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
              style={appearance.nameStyle(match.entry.color)}
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

  {#if pending.length}
    <div class="mb-2 flex flex-wrap gap-2">
      {#each pending as item (item.key)}
        {@const file = item.file}
        <div class="relative">
          {#if item.attachment?.image}
            <img
              src={attachmentUrl(item.attachment.id)}
              alt={file.name}
              class="h-20 w-20 rounded-xl border object-cover"
            />
          {:else if item.attachment && isAudioType(item.attachment.mime)}
            <AudioEmbed attachment={item.attachment} compact />
          {:else if !item.attachment && isImageType(file.type)}
            <div class="bg-muted/40 h-20 w-20 rounded-xl border"></div>
          {:else}
            <div
              class="bg-muted/40 flex h-20 w-44 flex-col justify-center gap-1 rounded-xl border px-3"
            >
              <div class="flex items-center gap-2">
                <FileIcon class="size-4 shrink-0" />
                <span class="truncate text-xs font-medium" title={file.name}>
                  {file.name}
                </span>
              </div>
              <span class="text-muted-foreground text-[10px]">
                {formatBytes(file.size)}
              </span>
            </div>
          {/if}

          {#if !item.attachment}
            <div class="bg-background/50 absolute inset-0 flex items-end rounded-xl">
              <div class="bg-muted mx-1.5 mb-1.5 h-1 flex-1 overflow-hidden rounded-full">
                <div
                  class="bg-primary h-full rounded-full transition-[width] duration-150"
                  style="width:{Math.round(item.progress * 100)}%"
                ></div>
              </div>
            </div>
          {/if}

          {#if isCompressibleImageType(file.type)}
            <Button
              variant={item.keepOriginal ? "default" : "secondary"}
              size="icon-xs"
              class="absolute -top-1.5 -left-1.5 rounded-full"
              title={item.keepOriginal
                ? "Sending the original. Click to compress and save space"
                : "Compressed to save space. Click to send the original quality"}
              onclick={() => toggleOriginal(item.key)}
            >
              <Sparkles class="size-3" />
            </Button>
          {/if}

          <Button
            variant="secondary"
            size="icon-xs"
            class="absolute -top-1.5 -right-1.5 rounded-full"
            title="Remove attachment"
            onclick={() => removePending(item.key)}
          >
            <X class="size-3" />
          </Button>
        </div>
      {/each}
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

  <div
    class="bg-input/50 focus-within:border-ring focus-within:ring-ring/30 relative flex items-start gap-0.5 rounded-2xl border border-transparent p-1 transition-[color,box-shadow] duration-200 focus-within:ring-3"
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
    <input bind:this={fileEl} type="file" multiple class="hidden" onchange={onpick} />
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled || pending.length >= MAX_ATTACHMENTS_PER_MESSAGE}
      title="Attach files"
      onclick={() => fileEl?.click()}
    >
      <Paperclip class="size-4" />
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
    <Button
      size="icon"
      disabled={disabled || uploading}
      onclick={submit}
      title={uploading ? "Waiting for uploads…" : "Send"}
    >
      <Send class="size-4" />
    </Button>

    {#if showCount}
      <div
        bind:this={countEl}
        class={[
          "pointer-events-none absolute right-3 bottom-1.5 text-xs tabular-nums",
          remaining <= 0 ? "text-destructive" : "text-muted-foreground",
        ]}
        aria-live="polite"
      >
        {remaining}
      </div>
    {/if}
  </div>
</div>
