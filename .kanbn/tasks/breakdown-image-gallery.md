---
created: 2026-08-06T23:12:25.000Z
updated: 2026-08-06T23:12:25.000Z
assigned: ""
progress: 0
tags:
  - breakdown
---

# breakdown image-gallery

Split `chat/message/image-gallery.svelte` (296 lines, ~128 script, 7 runes). The
bulk is a pan/zoom interaction state machine that reads badly inline and is hard
to test where it sits:

- `setZoom`, `clampPan`, `onPanStart`, `onPanMove`, `onPanEnd`
- `stepZoom`, `show`, the keyboard `CONTROLS` map
- `saveImage`, `openInBrowser`

Target shape:

- `image-gallery/zoom-controller.svelte.ts` — the pan/zoom math + keyboard map
  as a class
- `image-gallery/gallery-grid.svelte` — the thumbnail grid
- `image-gallery/lightbox.svelte` — the zoomed overlay

Behaviour must stay identical; follow with `/simplify` on the resulting diff.
