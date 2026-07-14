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

Message storage is **plaintext at rest on your machine** (TLS protects it in
transit — put the server behind a reverse proxy or tunnel for HTTPS). This is the
right trade-off when you trust whoever runs the box; see *Roadmap* for optional
end-to-end encryption.

## Quick start (development)

Requires Node 20+.

```bash
npm install          # installs both workspaces
npm run dev          # server on :8080, client (Vite) on :5173
```

Open http://localhost:5173. On first boot the server prints the **owner login**
and an **invite code** to the terminal — use the invite code on the client's
Register screen to create accounts.

Run the pieces separately if you prefer: `npm run dev:server` / `npm run dev:client`.

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

# 2. Run it with this repo's config (uses the same devkey/secret as the app)
livekit-server --config livekit.yaml --node-ip 127.0.0.1

# 3. In another terminal, run the app pointed at it
npm run dev
```

Then open the app in **two** browser profiles, log in as two users, join the same
voice channel, and allow microphone access. (Voice needs a second real
participant + a mic to fully exercise — everything else works solo.)

For deployment, `docker compose up` on a **Linux** host runs everything including
voice with no extra steps.

## Self-hosting (Docker)

```bash
# edit docker-compose.yml (COMMUNITY_NAME, OWNER_PASSWORD) first
docker compose up -d --build
docker compose logs -f          # grab the invite code printed on first boot
```

The app is now on `http://<your-host>:8080`. To let friends reach a home machine
without exposing your IP or opening ports, front it with a **Cloudflare Tunnel**
or **Tailscale** — that also gives you HTTPS.

## Project layout

```
server/
  src/
    index.ts        HTTP + WebSocket bootstrap, static hosting
    env.ts          all configuration (env vars)
    db/             Drizzle schema + SQLite connection/migration
    auth.ts         scrypt hashing, tokens, role guards
    hub.ts          in-memory realtime fan-out
    ws.ts           WebSocket auth + message handling
    bootstrap.ts    first-boot owner/channels/invite seeding
    views.ts        API serialization helpers
    routes/         auth · invites · channels · messages · moderation · voice
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
      components/      Login · Chat · Members · VoiceBar
      components/ui/   shadcn-svelte primitives (button, card, sheet, …)
  components.json   shadcn-svelte config (style: rhea, icons: lucide)
livekit.yaml        SFU config (voice)
docker-compose.yml  app + livekit services
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
