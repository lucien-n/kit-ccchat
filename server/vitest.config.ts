import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/vitest.setup.ts"],
    // The db handle is a module-scope singleton, so files must not share a
    // module registry: each needs its own database.
    isolate: true,
    pool: "forks",
  },
});
