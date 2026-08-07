import { m } from "$lib/paraglide/messages";
import { api } from "$lib/api";
import { loadEmoji, searchEmoji, shortcodeQuery, type EmojiIndex } from "$lib/emoji";
import { apiErrorMessage } from "$lib/forms";
import { isRejectedAtLimit, shakeAtLimit } from "$lib/length";
import { mentionQuery, searchMentions } from "$lib/mentions";
import { appearance } from "$lib/stores";
import { MAX_ATTACHMENTS_PER_MESSAGE, MESSAGE_MAX_LENGTH } from "@motus/shared";
import { tick } from "svelte";
import { toast } from "svelte-sonner";
import {
  SuggestionKind,
  type ComposerHost,
  type Pending,
  type Suggestion,
} from "./composer.types";

export class Composer {
  draft = $state("");
  el = $state<HTMLTextAreaElement | null>(null);
  countEl = $state<HTMLElement | null>(null);
  fileEl = $state<HTMLInputElement | null>(null);
  preview = $state(false);
  pending = $state<Pending[]>([]);

  matches = $state<readonly Suggestion[]>([]);
  active = $state(0);
  anchor = $state(-1);
  #index = $state<EmojiIndex | null>(null);

  uploading = $derived(this.pending.some((p) => !p.attachment));
  open = $derived(this.anchor >= 0 && this.matches.length > 0);
  remaining = $derived(MESSAGE_MAX_LENGTH - this.draft.length);
  showCount = $derived(this.remaining <= 200);
  showPreview = $derived(this.preview && this.draft.trim().length > 0);

  #host: ComposerHost;

  constructor(host: ComposerHost) {
    this.#host = host;
  }

  focus = () => {
    this.el?.focus();
  };

  close = () => {
    this.anchor = -1;
    this.matches = [];
    this.active = 0;
  };

  // The keystroke that starts the load gets no list, so refresh when it lands.
  ensureIndex = () => {
    if (this.#index) return;
    void loadEmoji().then((i) => {
      this.#index = i;
      if (this.el && document.activeElement === this.el) this.refresh();
    });
  };

  #show = (start: number, list: Suggestion[]) => {
    if (!list.length) return this.close();
    this.anchor = start;
    this.matches = list;
    this.active = 0;
  };

  refresh = () => {
    if (!this.el) return;
    const caret = this.el.selectionStart ?? 0;
    const before = this.draft.slice(0, caret);

    const at = mentionQuery(before);
    if (at) {
      const hits = searchMentions(at.query);
      return this.#show(
        at.start,
        hits.map((entry) => ({ kind: SuggestionKind.Mention, entry })),
      );
    }

    const found = shortcodeQuery(before);
    if (!found) return this.close();
    if (!this.#index) {
      this.ensureIndex();
      return this.close();
    }
    const hits = searchEmoji(this.#index, found.query, 10);
    return this.#show(
      found.start,
      hits.map((entry) => ({ kind: SuggestionKind.Emoji, entry })),
    );
  };

  #insert = async (text: string, from: number, to: number) => {
    const pos = from + text.length;
    this.draft = this.draft.slice(0, from) + text + this.draft.slice(to);
    this.close();
    await tick();
    this.el?.focus();
    this.el?.setSelectionRange(pos, pos);
  };

  accept = (match: Suggestion) => {
    const caret = this.el?.selectionStart ?? this.draft.length;
    const text = match.kind === SuggestionKind.Emoji ? match.entry[0] : match.entry.token;
    void this.#insert(`${text} `, this.anchor, caret);
  };

  insertAtCaret = (emoji: string) => {
    const from = this.el?.selectionStart ?? this.draft.length;
    const to = this.el?.selectionEnd ?? from;
    void this.#insert(emoji, from, to);
  };

  // Content changing is the only honest signal that someone is writing: focus
  // alone can sit on an empty box all day, and an emptied box is a change of
  // mind, not a message on its way.
  changed = () => {
    this.refresh();
    if (this.draft.trim()) this.#host.ontyping?.();
  };

  #addFiles = (files: Iterable<File>) => {
    const room = MAX_ATTACHMENTS_PER_MESSAGE - this.pending.length;
    for (const file of [...files].slice(0, room)) {
      const key = crypto.randomUUID();
      this.pending = [
        ...this.pending,
        {
          key,
          file,
          keepOriginal: false,
          progress: 0,
          attachment: null,
          controller: null,
        },
      ];
      void this.#uploadOne(file, key, false);
    }
  };

  #uploadOne = async (file: File, key: string, keepOriginal: boolean) => {
    const controller = new AbortController();
    this.#patchPending(key, { controller, attachment: null, progress: 0 });

    try {
      const attachment = await api.attachments.upload(file, {
        keepOriginal,
        signal: controller.signal,
        onProgress: (frac) => {
          // The bar only renders whole percents; skip ticks that wouldn't move it.
          const p = this.pending.find((p) => p.key === key);
          if (p && Math.round(frac * 100) !== Math.round(p.progress * 100))
            this.#patchPending(key, { progress: frac });
        },
      });
      // A later toggle or removal may have superseded this upload - ignore its result.
      const p = this.pending.find((p) => p.key === key);
      if (!p || p.controller !== controller) return;
      this.#patchPending(key, { attachment, controller: null });
    } catch (e) {
      // A toggle/removal aborts the request on purpose, so stay silent for that.
      if (e instanceof DOMException && e.name === "AbortError") return;
      const p = this.pending.find((p) => p.key === key);
      if (p && p.controller === controller) this.removePending(key);
      toast.error(apiErrorMessage(e, m.composer_upload_failed()));
    }
  };

  /** Re-upload an image at the opposite quality, cancelling the in-flight request.
   *  Only offered for compressible images (animated/other files are always sent
   *  as-is). */
  toggleOriginal = (key: string) => {
    const p = this.pending.find((p) => p.key === key);
    if (!p) return;
    p.controller?.abort();
    const keepOriginal = !p.keepOriginal;
    this.#patchPending(key, {
      keepOriginal,
      attachment: null,
      progress: 0,
      controller: null,
    });
    void this.#uploadOne(p.file, key, keepOriginal);
  };

  #patchPending = (key: string, changes: Partial<Pending>) => {
    this.pending = this.pending.map((p) => (p.key === key ? { ...p, ...changes } : p));
  };

  removePending = (key: string) => {
    this.pending.find((p) => p.key === key)?.controller?.abort();
    this.pending = this.pending.filter((p) => p.key !== key);
  };

  onpaste = (e: ClipboardEvent) => {
    const files = [...(e.clipboardData?.items ?? [])]
      .filter((i) => i.kind === "file")
      .map((i) => i.getAsFile())
      .filter((f) => f !== null);
    if (!files.length) return;
    e.preventDefault();
    this.#addFiles(files);
  };

  onpick = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    this.#addFiles(input.files ?? []);
    input.value = "";
  };

  submit = () => {
    if (this.uploading) return; // let in-flight uploads finish before sending
    const text = this.draft.trim();
    const ready = this.pending.filter((p) => p.attachment);
    if (!text && !ready.length) return;
    if (
      this.#host.onsend(
        text,
        ready.map((p) => p.attachment!.id),
      )
    ) {
      this.draft = "";
      this.pending = [];
      this.close();
    }
  };

  onkeydown = (e: KeyboardEvent) => {
    if (isRejectedAtLimit(e, this.remaining <= 0))
      shakeAtLimit(this.countEl, appearance.motionReduced);

    if (this.open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.active = (this.active + 1) % this.matches.length;
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        this.active = (this.active - 1 + this.matches.length) % this.matches.length;
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        this.accept(this.matches[this.active]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        this.close();
        return;
      }
    }
    // Only once the suggestion list above has had its chance at Escape.
    if (e.key === "Escape" && this.#host.replyingTo()) {
      e.preventDefault();
      this.#host.oncancelreply?.();
      return;
    }
    // isComposing: mid-IME, Enter commits a candidate rather than sending.
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      this.submit();
    }
  };
}
