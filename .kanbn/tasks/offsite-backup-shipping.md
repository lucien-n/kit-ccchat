---
created: 2026-08-05T18:36:37.000Z
updated: 2026-08-05T18:36:37.000Z
assigned: ""
progress: 0
tags: []
---

# offsite backup shipping

Ship database backups off the host so a dead disk doesn't take them with it -
today they live in the same `data/` volume as the DB. First target: a Synology
DS218 NAS on the home network. Push each scheduled snapshot over SFTP/rsync (or
WebDAV) to a configured destination; mirror the retention policy remotely so old
copies get pruned there too. Build on the existing `backups.service` scheduler;
config via env (host, path, credentials/key). Keep it optional and off by default.

## History

- type: created
  date: 2026-08-05T18:36:37.000Z
  column: Backlog
  fromProgress: 0
  toProgress: 0
