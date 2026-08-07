---
created: 2026-08-06T23:12:25.000Z
updated: 2026-08-06T23:12:25.000Z
assigned: ""
progress: 0
tags:
  - breakdown
---

# breakdown roles-panel

Split `roles-panel.svelte` (311 lines, ~164 script, 11 runes) the way
`message-composer` was split: a `.svelte.ts` controller for state + async, plus
presentational children. It currently juggles three separate concerns in one
file:

- Role CRUD - `create`, `saveEdit`, `remove`, dirty-tracking
- A drag-reorder state machine - `ordered`, `dragging`, `consider`, `finalize`,
  the syncing `$effect`
- Member assignment - `shownMembers` search, `toggleMember`, `countFor`

Target shape:

- `roles-panel/roles-panel.svelte.ts` - `RolesController` holding the state and
  the async actions
- `roles-panel/role-list.svelte` - the reorderable role list
- `roles-panel/role-editor.svelte` - the edit form
- `roles-panel/member-assignment.svelte` - the member search + toggle list
- `roles-panel/index.ts` re-export

Behaviour must stay identical; follow with `/simplify` on the resulting diff.
