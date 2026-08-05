---
created: 2026-08-05T18:36:37.000Z
updated: 2026-08-05T18:36:37.000Z
assigned: ""
progress: 0
tags: []
---

# custom emojis

Community-uploaded custom emojis, used by `:shortcode:`. Server: an emoji table +
blob store + admin-gated CRUD; picker and message renderer show the images.

The composer is the catch. It's a plain `<textarea>` that renders Twemoji through
a COLR font, which can't show uploaded images inline. Two ways:

- **Option A (lean this way first):** keep the textarea, type `:shortcode:` (the
  shortcode autocomplete already exists) and render the image only in the sent
  message. Minimal change; you see the shortcode while typing, the image once sent.
- **Option B:** swap the composer for a contentEditable div so emoji images show
  as you type. WYSIWYG but a real rework (selection, paste, IME, caret handling).

## History

- type: created
  date: 2026-08-05T18:36:37.000Z
  column: Backlog
  fromProgress: 0
  toProgress: 0
