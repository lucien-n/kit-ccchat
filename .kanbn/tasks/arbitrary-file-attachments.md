---
created: 2026-08-05T18:36:37.000Z
updated: 2026-08-06T22:36:11.125Z
assigned: ""
progress: 0
tags: []
started: 2026-08-06T12:37:38.564Z
completed: 2026-08-06T22:36:11.125Z
---

# arbitrary file attachments

Extend uploads beyond images to arbitrary files (pdf, zip, txt, ...). Reuse the
blob store; add a generic attachment table, size/type sniffing, a download
endpoint, and a file chip (name, size, icon) in the message. Enforce a max size.
Images keep their current rich inline preview; everything else shows as a chip.

## History

- type: created
  date: 2026-08-05T18:36:37.000Z
  column: Backlog
  fromProgress: 0
  toProgress: 0
- type: moved
  date: 2026-08-06T12:37:38.564Z
  fromColumn: Backlog
  toColumn: In Progress
- type: moved
  date: 2026-08-06T22:36:11.125Z
  fromColumn: In Progress
  toColumn: Done
