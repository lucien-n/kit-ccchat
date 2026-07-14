# Single image that builds the SvelteKit client and runs the backend, which then
# serves both the API/WebSocket and the built static client on one port.
FROM node:22-slim

# Build tools are a fallback in case better-sqlite3 has no prebuilt binary for
# this platform; usually the prebuild is downloaded and these go unused.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies for both workspaces first (better layer caching).
COPY package.json package-lock.json* ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm install

# Copy sources and build the client.
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/app/data
EXPOSE 8080

CMD ["npm", "start"]
