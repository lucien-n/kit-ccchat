import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Static SPA: a single index.html fallback so the app runs as a pure
    // client. This is what makes it wrappable with Capacitor for mobile.
    adapter: adapter({ fallback: 'index.html' }),
  },
};

export default config;
