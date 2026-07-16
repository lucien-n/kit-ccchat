import { beforeEach } from "vitest";
import { resetRateLimits } from "../src/ratelimit.js";

// Rate-limit buckets live in module scope, so without this every test inherits
// the hits of the one before it and suites fail in file order rather than on
// their own merits. Tests that are *about* the limiter build their state inside
// a single `it`, so they're unaffected.
beforeEach(resetRateLimits);
