import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Deliberately not the SvelteKit vite config: these cover plain .ts modules, so
// pulling in the kit plugin would only buy a slower start. The one thing that
// has to be restated is $lib, which the plugin would otherwise provide.
export default defineConfig({
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
