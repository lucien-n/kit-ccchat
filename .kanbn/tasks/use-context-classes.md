---
created: 2026-07-21T17:23:53.491Z
updated: 2026-07-21T18:54:39.891Z
assigned: ""
progress: 0
tags: []
started: 2026-07-21T18:34:57.733Z
completed: 2026-07-21T18:54:39.891Z
---

# use context classes

create context classes for things like channels, users, messages.
avoids prop drilling (like passing a channel object from the singlechannel, to the contextmenu to the confirmation dialog).
centralizes actions (like which dialogs are open, data and api calls)
