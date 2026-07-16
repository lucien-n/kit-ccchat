import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const API_TARGET = process.env.API_TARGET ?? "http://localhost:8080";
const LIVEKIT_TARGET = process.env.LIVEKIT_TARGET ?? "http://localhost:7880";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    // Stand in for Caddy, so dev has the same single-origin shape as production
    // and we exercise the same URL-derivation code path.
    proxy: {
      // xfwd sends X-Forwarded-Host/Proto, which is how the backend works out
      // the LiveKit URL to hand back to the browser.
      "/api": { target: API_TARGET, changeOrigin: true, xfwd: true },
      "/ws": { target: API_TARGET, ws: true, changeOrigin: true },
      // Mirrors the Caddyfile: /livekit/rtc -> livekit's /rtc.
      "/livekit": {
        target: LIVEKIT_TARGET,
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/livekit/, ""),
      },
    },
  },
});
