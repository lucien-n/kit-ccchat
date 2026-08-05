---
created: 2026-08-05T18:36:37.000Z
updated: 2026-08-05T18:36:37.000Z
assigned: ""
progress: 0
tags: []
---

# two factor auth

Optional TOTP second factor on login (authenticator app - no SMS or email, since
motus has no email). Enrollment shows a QR + secret and a set of one-time
recovery codes; sign-in asks for the 6-digit code when 2FA is on. Store the
secret per user, verify server-side. Strictly opt-in per account.

## History

- type: created
  date: 2026-08-05T18:36:37.000Z
  column: Backlog
  fromProgress: 0
  toProgress: 0
