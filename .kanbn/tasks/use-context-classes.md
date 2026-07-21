---
created: 2026-07-21T17:23:53.491Z
updated: 2026-07-21T17:24:02.093Z
assigned: ""
progress: 0
tags: []
---

# use context classes

create context classes for things like channels, users, messages.
avoids prop drilling (like passing a channel object from the singlechannel, to the contextmenu to the confirmation dialog).
centralizes actions (like which dialogs are open, data and api calls)
