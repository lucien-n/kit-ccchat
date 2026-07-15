# Multi-stage: the client toolchain (Vite, Svelte, Tailwind) is only needed to
# produce static files, so it never reaches the runtime image. That keeps the
# thing people actually pull small — which matters on the low-power boxes this
# is meant to be self-hosted on.

# ── build ────────────────────────────────────────────────────────────────────
FROM node:22-slim AS build

# Fallback toolchain in case better-sqlite3 has no prebuilt binary for this
# platform (notably linux/arm64); usually the prebuild is downloaded instead.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies first, so editing source doesn't invalidate the install layer.
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm install

COPY . .
RUN npm run build

# Re-install without dev dependencies for the runtime image. The server runs
# TypeScript directly via tsx, so its sources are copied as-is (no dist step).
RUN npm prune --omit=dev

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:22-slim AS runtime

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server ./server
COPY --from=build /app/client/build ./client/build

ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/app/data
ENV CLIENT_DIR=/app/client/build
EXPOSE 8080

CMD ["npm", "start"]
