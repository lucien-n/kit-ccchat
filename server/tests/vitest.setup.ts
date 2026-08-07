import "./env-setup.js"; // must be first: sets DATA_DIR before any db import
import { beforeEach } from "vitest";
import { resetRateLimits } from "../src/ratelimit.js";

// Buckets are module scope; without this, tests inherit each other's hits.
beforeEach(resetRateLimits);
