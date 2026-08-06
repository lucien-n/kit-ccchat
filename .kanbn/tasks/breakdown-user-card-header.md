---
created: 2026-08-06T23:12:25.000Z
updated: 2026-08-06T23:12:25.000Z
assigned: ""
progress: 0
tags:
  - breakdown
---

# breakdown user-card-header

Split `common/user-card/user-card-header.svelte` (349 lines, ~160 script, 9
runes). It glues four independent editing flows together:

- Accent colour — `previewAccent`, `saveAccent`, `resolveColor`
- Name / bio drafts — `nameDraft`, `bioDraft`, the seeding `$effect`,
  `commitProfile`, `saveName`, `saveBio`, bio length limit
- Avatar upload / remove — `onAvatarFile`, `removeAvatar`
- Banner upload / remove — `onBannerFile`, `removeBanner`

Target shape:

- `user-card/profile-editor.svelte.ts` — a `ProfileEditor` class for the draft
  state and the async save/upload actions
- `user-card/avatar-edit.svelte` and `user-card/banner-edit.svelte` — the two
  image flows as subcomponents

The folder already uses the `index.ts` + subcomponent convention
(`user-card-actions.svelte` sits right next to it), so the split is cheap and
idiomatic. Behaviour must stay identical; follow with `/simplify` on the diff.
