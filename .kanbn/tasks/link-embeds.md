---
created: 2026-08-05T18:36:37.000Z
updated: 2026-08-07T13:01:00.000Z
completed: 2026-08-07T13:01:00.000Z
assigned: ""
progress: 1
tags: []
---

# link embeds

Unfurl URLs in messages into embed cards (title, description, thumbnail). Server
fetches OpenGraph/oEmbed metadata - with SSRF guards (block private ranges) and a
cache - and returns it for the message to render as a card beneath the text. The
fetch is server-side, not from the client, so nobody's IP leaks to the linked
site. Consider a per-message opt-out.

## History

- type: created
  date: 2026-08-05T18:36:37.000Z
  column: Backlog
  fromProgress: 0
  toProgress: 0
- type: completed
  date: 2026-08-07T13:01:00.000Z
  column: Done
  fromProgress: 0
  toProgress: 1
