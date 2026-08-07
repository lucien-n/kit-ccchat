---
created: 2026-08-06T23:12:25.000Z
updated: 2026-08-06T23:12:25.000Z
assigned: ""
progress: 0
tags:
  - breakdown
  - low-priority
---

# breakdown system-panel

Lower-ROI than the other breakdowns - `community/system-panel.svelte` (362
lines, ~141 script, 7 runes) is less tangled, mostly one concern. Worth doing
mainly if the separate SSD disk gauge lands (see attachments follow-ups), since
that grows the disk section.

Extraction points:

- stats loading + backup/delete async actions → a small `.svelte.ts` controller
- the disk-usage `segments` `$derived.by` computation → pull out with the gauge
- split the backups list and the disk gauge into their own subcomponents

Behaviour must stay identical; follow with `/simplify` on the diff.
