---
created: 2026-08-05T18:36:37.000Z
updated: 2026-08-07T08:34:02.000Z
assigned: ""
progress: 1
tags: []
started: 2026-08-07T08:19:48.929Z
completed: 2026-08-07T08:34:02.000Z
---

# pinned messages

Pin messages per channel, with a pinned-list popover in the channel header to
browse and jump to them. Needs a pins table (channelId, messageId, pinnedBy, at),
CRUD API, a WS event so everyone updates live, and the UI to pin/unpin from a
message's actions. Decide the gate (author + admin, or admin only).

## Notes

- Gate chosen: **author + admin** - the message author can pin/unpin their own
  message, and anyone with `deleteAnyMessage` (admin/owner) can pin/unpin any.
  Mirrors the existing deletion gate.
- `message_pins` table (messageId PK, channelId, pinnedBy, pinnedAt), migration
  `0019_past_moondragon.sql`, index on (channelId, pinnedAt).
- API: `PUT/DELETE /api/messages/:id/pin`, `GET /api/messages/:channelId/pins`.
- `Message_Pinned` WS event broadcasts `{ id, channelId, pinned }`; `pinned` is
  now a field on `MessageView` so a message's own badge/actions stay live.
- UI: pin/unpin in the message actions bar, a "Pinned" badge on pinned messages,
  and a pins popover in the channel header that browses and jumps.
- Cap: `MAX_PINS_PER_CHANNEL = 50`.

## History

- type: created
  date: 2026-08-05T18:36:37.000Z
  column: Backlog
  fromProgress: 0
  toProgress: 0
- type: moved
  date: 2026-08-07T08:19:48.929Z
  fromColumn: Backlog
  toColumn: In Progress
- type: moved
  date: 2026-08-07T08:34:02.000Z
  fromColumn: In Progress
  toColumn: Done
  fromProgress: 0
  toProgress: 1
