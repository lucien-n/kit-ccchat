# ccchat

Self-hosted chat for you and your friends. Runs on one machine, keeps your data
there, no company in the middle.

> **Early days. Not production ready.** Built fast, and a lot of it still needs a
> second pass. Expect rough edges and breaking changes with no upgrade path
> between versions. Fine for a private server with people you know. Don't put
> anything in it you'd hate to lose.

## What's in it

- Invite-only accounts. Username and password, no email, no third-party login.
- Text channels with replies, edits, reactions, uploads, search, typing
  indicators and unread badges.
- Voice and video channels over a self-hosted LiveKit SFU, plus screen share and
  a soundboard.
- Roles and moderation: delete, mute, kick, ban, under an owner > admin > member
  hierarchy.
- Web push notifications.

Svelte 5 SPA on the front, Hono + TypeScript on the back, SQLite through Drizzle,
LiveKit for voice. In production one process serves both the API and the client,
and the whole community lives in a single SQLite file under `data/`. Messages are
plaintext at rest; TLS covers them in transit.

## Development

Node 20+.

```bash
npm install
npm run dev          # server on :8080, client on :5173
```

Open http://localhost:5173. First load is the setup wizard: name the community,
make the owner account, grab an invite code for everyone else. Delete
`server/data/` to start over. Both sides hot-reload; Docker is only for
deployment.

### Voice in dev

Voice doesn't work when LiveKit runs under Docker Desktop on Windows or macOS.
Docker Desktop can't pass WebRTC UDP media, so the channel sits on "Connecting…"
and then drops. It's a Docker Desktop limitation, not a bug here, and text is
unaffected. On a real Linux host it just works.

To test voice on Windows or macOS, run LiveKit natively instead
(`winget install LiveKit.livekit` or `brew install livekit`):

```bash
LIVEKIT_KEYS="ccchat: dev-only-insecure-secret-set-LIVEKIT_API_SECRET" \
  livekit-server --config livekit.yaml --node-ip 127.0.0.1
```

Then `npm run dev` in another terminal. Vite proxies `/livekit` to it, the same
way Caddy does in production. You'll want two browser profiles and a mic to test
it properly.

## Self-hosting

Linux on x86_64. The published image is amd64 only.

```bash
curl -fsSL https://raw.githubusercontent.com/lucien-n/kit-ccchat/main/install.sh | sh
```

It asks for your domain, generates the secrets, pulls the image and starts
everything. Re-run it to upgrade. Then open the site and claim it: the setup
wizard is open to whoever loads the page first, and closes for good once an
account exists.

You'll need:

- A domain pointing at the machine. Browsers block microphone access without
  HTTPS, and HTTPS needs a name. Caddy fetches the Let's Encrypt cert for you.
  Dynamic DNS (DuckDNS and the like) is fine.
- Ports 80/tcp, 443/tcp and 7882/udp open. The UDP one carries voice and is the
  one people forget; without it calls never connect.

Back up `data/` and you've backed up the whole community.

Or by hand:

```bash
cp .env.example .env         # set CCCHAT_DOMAIN + LIVEKIT_API_SECRET
docker compose up -d
```

## Roadmap

- TURN for strict NATs, so voice survives worse networks.
- Foreign keys and a proper backup story.
- A Capacitor mobile wrapper around the existing client.
- Maybe optional end-to-end encryption, if the threat model ever calls for it.
