import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Loaded first by vitest.setup.ts, which vitest evaluates ahead of the test
// module graph. env.ts binds DATA_DIR once, at eval time, so it must already
// point at a throwaway dir before the db module is imported anywhere - otherwise
// a test that writes would hit the developer's real database. This file imports
// nothing from src, so no db module can slip in ahead of these assignments (an
// import order the linters are free to reshuffle).
process.env.NODE_ENV = "test";
process.env.LIVEKIT_API_SECRET = "test-only-secret-not-a-real-one";
process.env.COMMUNITY_NAME = "Test Community";

export const DIR = mkdtempSync(join(tmpdir(), "motus-test-"));
process.env.DATA_DIR = DIR;
