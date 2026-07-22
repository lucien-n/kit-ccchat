---
created: 2026-07-21T22:17:46.991Z
updated: 2026-07-22T00:42:00.000Z
assigned: ""
progress: 1
tags: []
started: 2026-07-21T22:28:38.061Z
completed: 2026-07-22T00:42:00.000Z
---

# rework emoji picker to use custom emojis (not the system os ones)

Emoji render as Twemoji via a COLR/CPAL colour font (twemoji-colr-font), added
to the base font stack. One ~476KB woff2, hashed and immutable-cached, no
per-emoji requests, and because it is a font it also renders inside the plain
composer textarea, not just in sent messages.
