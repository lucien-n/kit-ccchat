---
created: 2026-08-05T13:50:55.358Z
updated: 2026-08-05T18:36:37.000Z
assigned: ""
progress: 1
completed: 2026-08-05T18:36:37.000Z
tags: []
---

# db backups

Scheduled online SQLite snapshots into `data/backups` (WAL-safe `.backup()`),
with retention/pruning and env config (`BACKUP_INTERVAL_HOURS`,
`BACKUP_RETENTION`). Owner monitors them in the system panel: list with size and
time, total/last/next, plus take-now, download and delete. Offsite shipping to a
NAS split out into [offsite-backup-shipping](offsite-backup-shipping.md).

## History

- type: created
  date: 2026-08-05T13:50:55.358Z
  column: Backlog
  fromProgress: 0
  toProgress: 0
- type: moved
  date: 2026-08-05T18:36:37.000Z
  fromColumn: Backlog
  toColumn: Done
  fromProgress: 0
  toProgress: 1
