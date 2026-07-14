import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const API_TARGET = process.env.API_TARGET ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    // In dev, forward API + WebSocket traffic to the backend so the client can
    // use same-origin relative URLs everywhere.
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/ws': { target: API_TARGET, ws: true, changeOrigin: true },
    },
  },
});
