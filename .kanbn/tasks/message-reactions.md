---
created: 2026-07-22T10:47:50.039Z
updated: 2026-07-22T16:23:31.345Z
assigned: ""
progress: 0
tags: []
started: 2026-07-22T00:00:00.000Z
---

# message reactions

Click an emoji under a message to react, click it again to take it back. Pills
show the emoji and how many people picked it, and yours is highlighted. Same
picker the composer uses, so only emoji the Twemoji font can actually draw.

## Decisions

Settled up front so they don't get re-argued mid-build:

- Reactions go over REST, not the socket, like edit and delete already do. Add
  and remove are separate calls so a double click or a retry can't flip you to
  the opposite of what you wanted.
- The database stores the emoji itself, not the `:shortcode:`. Nothing has to
  look anything up to draw a pill.
- A message carries the list of people who reacted, not just a number. Costs a
  few ids per pill, and it's what makes "who reacted?" on hover possible without
  another endpoint.
- Reactions arrive on their own event, not by pretending the message was edited.
- Muted people can't react. Mute means you can't say anything, and twenty pills
  is saying something.

## Watch out for

- A reaction landing on the last message makes it taller, and the auto-scroll
  only re-pins when the message count changes, so the view jumps a little. Widen
  what that effect watches.
- Reading reactions per message adds another query per row on a 50-message page.
  Fine for SQLite in-process, worth knowing before blaming it for something else.
- Don't do optimistic updates first. The round trip is a few milliseconds on the
  machine this runs on, so let the broadcast be the only thing that changes
  state, and only add optimism if a click actually feels slow.

## Not doing

- Custom emoji. Needs an upload story and the font can't draw them anyway.
- Skin tone variants. Yellow is fine.
- Admins clearing other people's reactions. The table allows it if it ever comes
  up, but nobody has asked.

## Sub-tasks

- [x] Pull the drawable emoji into `shared` and add the `reactionEmoji` schema so
the server can check a reaction against exactly what the picker offers
- [x] Add the `message_reactions` table and generate the migration
- [x] Add the reaction shape to `messageView` and the new `Message_Reacted` event
to the shared types
- [x] Server: read reactions back with a message, plus the add and remove
endpoints, and clear the rows when a message is deleted
- [x] Client: api calls, the store update, and handling the new event
- [x] The pills under a message, and an add-reaction button in the hover bar next
to reply/edit/delete
- [ ] Tests: the schema edges, muted people, deleted messages, and the cap on how
many different emoji one message can hold
- [ ] Have the seeder scatter a few reactions around, so this is testable without
logging in as two people
