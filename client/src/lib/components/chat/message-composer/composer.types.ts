import type { EmojiEntry } from "$lib/emoji";
import type { MentionSuggestion } from "$lib/mentions";
import type { MessageAttachment, MessageView } from "@motus/shared";

/** A file the composer is uploading or has uploaded, before it is bound to a
 *  sent message. `attachment` is null until the upload finishes; `controller`
 *  aborts the in-flight request when the chip is removed or its quality toggled.
 *  The original `file` is kept so a toggle can re-upload it. */
export interface Pending {
  key: string;
  file: File;
  keepOriginal: boolean;
  progress: number;
  attachment: MessageAttachment | null;
  controller: AbortController | null;
}

export enum SuggestionKind {
  Emoji = "emoji",
  Mention = "mention",
}

export type Suggestion =
  | { kind: SuggestionKind.Emoji; entry: EmojiEntry }
  | { kind: SuggestionKind.Mention; entry: MentionSuggestion };

/** The user actions the composer reports back. Declared once here and shared by
 *  the host and the component's props, which both surface the same callbacks. */
export interface ComposerCallbacks {
  onsend: (text: string, attachmentIds?: string[]) => boolean;
  ontyping?: () => void;
  oncancelreply?: () => void;
}

/** What the composer needs from its host: the callbacks above, plus `replyingTo`
 *  as a getter so it tracks the prop reactively. */
export interface ComposerHost extends ComposerCallbacks {
  replyingTo: () => MessageView | null;
}
