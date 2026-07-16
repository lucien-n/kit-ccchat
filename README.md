# ccchat

A **self-hosted, Discord-like chat** for you and your friends. One machine, your
data, no third party. Built because centralized platforms are now subject to
mandatory message scanning — self-hosting sidesteps that entirely: there's no
provider in the middle to compel.

- **Invite-only, no email.** The owner shares an invite code; people redeem it to
  create a per-server profile (username + password). No external accounts.
- **Realtime text channels** over WebSocket, with **unread badges + a
  notification sound** (per-channel badge, tab-title count, mutable chime).
- **Voice channels** powered by a self-hosted **LiveKit SFU** — scales to 20+
  people per room (not a peer-to-peer mesh). Moderation mutes carry into voice.
- **Moderation**: delete messages, mute, kick, ban — with an owner > admin >
  member role hierarchy.
- **Web now, mobile-ready.** The UI is a static Svelte SPA, so the same codebase
  wraps into a native iOS/Android app with Capacitor later.

Scales comfortably to your 30–50 people on a single box.

## Architecture

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  client/  (SvelteKit SPA)    │  HTTP  │  server/  (TypeScript)       │
│  Svelte 5 · adapter-static   │ <────> │  Hono (REST API)             │
│  → web today                 │  WS    │  ws  (realtime text)         │
│  → Capacitor mobile later    │ <────> │  Drizzle + SQLite  (1 file)  │
└──────────────┬──────────────┘        └──────────────────────────────┘
               │ WebRTC (audio)          mints join tokens ▲
               ▼                                           │
        ┌─────────────────────────────────────────────────┘
        │  livekit/  (self-hosted SFU) — voice, scales to 20+
        └──────────────────────────────────────────────────
```

**How voice works:** the backend never touches audio — it only mints a
short-lived LiveKit access token (`POST /api/voice/token`, room = channel id).
The browser then connects its microphone straight to the LiveKit SFU, which
forwards each person's single upstream to everyone else. That one-up-many-down
design is what scales past the ~5-user ceiling of a peer-to-peer mesh.

- **One process, one port.** In production the backend also serves the built
  client, so a self-hoster runs a single thing.
- **SQLite** holds everything in one file under `data/`. Back that up and you've
  backed up your whole community.
- **Passwords** are hashed with Node's built-in scrypt (no native crypto deps).
- **Auth** is an opaque bearer token — works the same for web and mobile.

Message storage is **plaintext at rest on your machine**; TLS protects it in
transit (Caddy terminates HTTPS with an automatic Let's Encrypt certificate).
This is the right trade-off when you trust whoever runs the box — see _Roadmap_
for optional end-to-end encryption.

## Quick start (development)

Requires Node 20+.

```bash
npm install          # installs both workspaces
npm run dev          # server on :8080, client (Vite) on :5173
```

Open http://localhost:5173. The first load shows the **setup wizard**: name your
community and create the owner account. You get an invite code — use it on the
Register screen to create more accounts. Delete `server/data/` to start over.

Run the pieces separately if you prefer: `npm run dev:server` / `npm run dev:client`.

The server hot-reloads (`tsx watch`) and the client has HMR, so **nothing needs
rebuilding while you work**. Docker is only for deployment.

### Testing voice locally

⚠️ **Voice does not work when LiveKit runs in Docker Desktop on Windows/macOS.**
Docker Desktop's network layer can't pass WebRTC UDP media — the signaling
connects and ICE negotiates, but the DTLS media handshake times out (a
documented Docker Desktop limitation, not a bug in ccchat). Symptom: a voice
channel shows "Connecting…" then disconnects. **Text chat is unaffected**, and
**voice works fine when the stack runs on a real Linux host** (VPS, Linux server,
Raspberry Pi), where Docker networking passes UDP normally.

To test voice on a Windows/macOS dev machine, run **LiveKit natively** (outside
Docker) so it binds directly to your network:

```bash
# 1. Install the LiveKit server binary (one time)
#    Windows : winget install LiveKit.livekit   (or grab a release from
#              https://github.com/livekit/livekit/releases)
#    macOS   : brew install livekit

# 2. Run it with this repo's config, bound to your machine. The key/secret here
#    just need to match what the dev server uses — anything works locally.
LIVEKIT_KEYS="ccchat: dev-only-insecure-secret-set-LIVEKIT_API_SECRET" \
  livekit-server --config livekit.yaml --node-ip 127.0.0.1

# 3. In another terminal, run the app pointed at it
npm run dev
```

Vite proxies `/livekit` to it, mirroring what Caddy does in production, so dev
exercises the same code path.

Then open the app in **two** browser profiles, log in as two users, join the same
voice channel, and allow microphone access. (Voice needs a second real
participant + a mic to fully exercise — everything else works solo.)

For deployment, `docker compose up` on a **Linux** host runs everything including
voice with no extra steps.

## Self-hosting

On any Linux box — a VPS, a Raspberry Pi, an old laptop, a £30 thin client:

```bash
curl -fsSL https://raw.githubusercontent.com/lucien-n/kit-ccchat/main/install.sh | sh
```

On Windows (Docker Desktop), in PowerShell:

```powershell
irm https://raw.githubusercontent.com/lucien-n/kit-ccchat/main/install.ps1 | iex
```

Either way it asks for **one** thing — your domain — then generates the secrets,
pulls the image and starts everything. Open the site and you'll be asked to name
your community and create your account; you get an invite code to share. **There
is no config file to edit.** Re-run the same command to upgrade.

> On Windows, Docker Desktop can't pass WebRTC UDP, so **voice won't connect**
> there — text chat is fine. For working voice, host on a Linux box (the Wyse is
> perfect) or run LiveKit natively; see _Testing voice locally_.

You need:

- **A domain pointing at the machine.** A free dynamic-DNS name (DuckDNS and
  friends) is fine. This isn't optional vanity: browsers refuse microphone access
  outside a secure context, so **voice requires HTTPS**, and HTTPS requires a
  name. Caddy gets the certificate from Let's Encrypt for you and renews it.
- **Three ports forwarded**: `80/tcp` and `443/tcp` for the app (80 is used to
  issue the certificate), and **`7882/udp` for voice media**. That last one is the
  one people forget — without it, calls fail to connect. WebRTC audio goes
  straight to the host; only signaling passes through the proxy.

Everything lives in `data/` — one SQLite file. Back up that folder and you've
backed up your entire community.

### Why there's nothing to configure

The usual pain of self-hosting a voice app is telling the browser where to find
the SFU: get it wrong and calls silently fail. Here Caddy puts LiveKit on the
**same origin** as the app (`/livekit`), so the server derives that URL from the
request the browser just made. However you reach ccchat, voice follows.

The community name, the owner account and the invite code are created **in the
browser** on first visit and stored in the database — so none of them are
environment variables, and the owner can change them later from Settings.

> The setup wizard is open to whoever loads the page first, and closes forever
> once an account exists. Claim your instance as soon as it's up.

`.env.example` documents the escape hatches (pinning an image version, seeding the
owner from the environment for scripted installs). You can ignore it.

### Doing it by hand

```bash
git clone https://github.com/lucien-n/kit-ccchat && cd ccchat
cp .env.example .env         # set CCCHAT_DOMAIN + LIVEKIT_API_SECRET
docker compose up -d
```

To build the image locally instead of pulling it (don't do this on the low-power
box you're hosting on — compiling the client will crawl):

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

## Project layout

```
server/
  src/
    index.ts        HTTP + WebSocket bootstrap, static hosting
    env.ts          deployment-level config (ports, secrets)
    settings.ts     runtime config in the DB (community name) — owner-editable
    db/             Drizzle schema + SQLite connection/migration
    auth.ts         scrypt hashing, tokens, role guards
    hub.ts          in-memory realtime fan-out
    ws.ts           WebSocket auth + message handling
    bootstrap.ts    claiming a fresh instance: owner/channels/invite seeding
    views.ts        API serialization helpers
    routes/         setup · settings · auth · invites · channels · messages ·
                    moderation · voice · users
client/
  src/
    app.css         Tailwind v4 + shadcn-svelte theme tokens (light/dark)
    routes/         SPA entry (+page.svelte)
    lib/
      api.ts        typed REST client
      chat.svelte.ts   reactive app state, WebSocket, unread tracking (runes)
      voice.svelte.ts  LiveKit voice session state (runes)
      notify.ts        notification sound + tab-title badge
      utils.ts         cn() class helper (shadcn)
      components/      Setup · Login · Chat · Members · VoiceBar · Settings
      components/ui/   shadcn-svelte primitives (button, card, sheet, …)
  components.json   shadcn-svelte config (style: rhea, icons: lucide)
install.sh          one-command install for self-hosters (Linux/macOS)
install.ps1         the same, for Windows (Docker Desktop)
Caddyfile           TLS + puts the app and LiveKit on one origin
livekit.yaml        SFU config (voice)
docker-compose.yml  caddy + app + livekit
Dockerfile          multi-stage build; CI publishes it to ghcr.io
```

The UI is built with **Tailwind CSS v4** and **[shadcn-svelte](https://shadcn-svelte.com)**
(default theme applied from preset `b1JD4ULObq` — blue primary, Figtree font).
Add more primitives with `npx shadcn-svelte@latest add <component> -c client`.

## Roadmap

1. **Harden voice for production** — enable LiveKit's built-in TURN with a TLS
   domain for users behind strict NATs; consider video/screenshare (LiveKit
   already supports both).
2. **Mobile app** — wrap `client/` with Capacitor; point it at your server URL.
3. **Nice-to-haves** — attachments/images, message edit & reactions, typing
   indicators, per-channel permissions, push notifications.
4. **Optional end-to-end encryption** — a bigger project (per-device keys, no
   server-side search or content moderation). Worth it only if your threat model
   includes the host machine itself being seized.

```

```
