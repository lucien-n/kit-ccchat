# Multi-stage: the client toolchain (Vite, Svelte, Tailwind) is only needed to
# produce static files, so it never reaches the runtime image. That keeps the
# thing people actually pull small — which matters on the low-power boxes this
# is meant to be self-hosted on.

# ── build ────────────────────────────────────────────────────────────────────
FROM node:22-slim AS build

# Fallback toolchain for the case where better-sqlite3 has no prebuilt binary to
# download; on linux/amd64 the prebuild is used and this goes unexercised.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first, so editing source doesn't invalidate the install layer.
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci

COPY . .
RUN npm run build

# Re-install without dev dependencies for the runtime image. The server runs
# TypeScript directly via tsx, so its sources are copied as-is (no dist step).
RUN npm prune --omit=dev

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:22-slim AS runtime

# gosu drops us from root to the unprivileged `node` user *after* the entrypoint
# has fixed ownership of the bind-mounted data dir - the one thing that has to
# happen as root. It is the standard, purpose-built tool for exactly this.
RUN apt-get update \
  && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
# node_modules/@ccchat/shared is a workspace symlink to ../shared, so the real
# directory has to come along or every import of it dangles at runtime.
COPY --from=build /app/shared ./shared
COPY --from=build /app/server ./server
COPY --from=build /app/client/build ./client/build

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/app/data
ENV CLIENT_DIR=/app/client/build
EXPOSE 8080

# Liveness + readiness in one: /api/info is unauthenticated and reads the DB, so
# a 200 means the HTTP server and the database are both up. Uses node's built-in
# fetch - no curl/wget to add to the slim image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/info').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# The server itself runs as `node`; root lives only for the moment it takes the
# entrypoint to chown the data dir.
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
