# ccchat

Self-hosted, Discord-like chat for you and your friends. One machine, your data,
no third party in the middle.

> **Status: early. Not production ready.** This was built fast and a lot of it
> still needs a second pass. Expect rough edges, breaking changes and no upgrade
> path between versions. Fine for a private server with people you know; don't
> put anything you would miss in it.

What works today:

- **Invite-only accounts** — username + password, no email, no external provider.
- **Realtime text channels** with unread badges and a notification sound.
- **Voice channels** through a self-hosted LiveKit SFU.
- **Moderation** — delete, mute, kick, ban, with an owner > admin > member hierarchy.

Svelte 5 SPA (adapter-static) · Hono + TypeScript · SQLite via Drizzle · LiveKit
for voice. In production a single process serves both the API and the client, and
everything lives in one SQLite file under `data/`. Messages are stored plaintext
at rest; TLS protects them in transit.

## Development

Requires Node 20+.

```bash
npm install
npm run dev          # server on :8080, client on :5173
```

Open http://localhost:5173. The first load is the setup wizard: name the
community, create the owner account, get an invite code to register more people.
Delete `server/data/` to start over. Both sides hot-reload — Docker is only for
deployment.

### Voice in development

**Voice does not work when LiveKit runs under Docker Desktop on Windows or
macOS.** Docker Desktop can't pass WebRTC UDP media, so the channel shows
"Connecting…" and then drops. This is a Docker Desktop limitation, not a bug
here, and text chat is unaffected. On a real Linux host it works normally.

To exercise voice on Windows/macOS, run LiveKit natively instead
(`winget install LiveKit.livekit` or `brew install livekit`):

```bash
LIVEKIT_KEYS="ccchat: dev-only-insecure-secret-set-LIVEKIT_API_SECRET" \
  livekit-server --config livekit.yaml --node-ip 127.0.0.1
```

Then `npm run dev` in another terminal. Vite proxies `/livekit` to it, mirroring
what Caddy does in production. You need two browser profiles and a microphone to
test it properly.

## Self-hosting

Linux on x86_64 — the published image is amd64 only.

```bash
curl -fsSL https://raw.githubusercontent.com/lucien-n/kit-ccchat/main/install.sh | sh
```

It asks for your domain, generates the secrets, pulls the image and starts
everything. Re-run the same command to upgrade. Then open the site and claim it:
the setup wizard is open to whoever loads the page first and closes forever once
an account exists.

You need:

- **A domain pointing at the machine.** Browsers refuse microphone access outside
  a secure context, so voice requires HTTPS, which requires a name. Caddy handles
  the Let's Encrypt certificate. Dynamic DNS (DuckDNS and friends) is fine.
- **Ports `80/tcp`, `443/tcp` and `7882/udp`.** The UDP one carries voice media
  and is the one people forget; without it calls never connect.

Back up `data/` and you've backed up the whole community.

By hand:

```bash
cp .env.example .env         # set CCCHAT_DOMAIN + LIVEKIT_API_SECRET
docker compose up -d
```

There's a Windows installer too (`install.ps1`), but voice won't connect on
Docker Desktop, so Linux is the real target.

## Roadmap

- Harden voice for unreliable networks (TURN for strict NATs); maybe video.
- Attachments, reactions, typing indicators, push notifications.
- Capacitor mobile wrapper around the existing client.
- Possibly optional end-to-end encryption, if the threat model ever warrants it.
