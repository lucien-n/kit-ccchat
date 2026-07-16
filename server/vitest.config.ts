import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/vitest.setup.ts'],
    // Each file gets its own SQLite database in its own temp dir, and the db
    // handle is a module-scope singleton — so files must not share a module
    // registry. isolate keeps that true.
    isolate: true,
    pool: 'forks',
  },
});
