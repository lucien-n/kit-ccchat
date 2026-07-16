import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context, MiddlewareHandler } from "hono";

/** Caddy *appends* the real peer to any X-Forwarded-For the caller sent, so the
 *  last hop is the trustworthy one; the leftmost is attacker-controlled. */
export function clientIp(c: Context): string {
  const xff = c.req.header("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const vouched = hops[hops.length - 1];
    if (vouched) return vouched;
  }
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    return "unknown";
  }
}

type Time = number;

const buckets = new Map<string, Time[]>();

// unref: a timer must not hold a test run or a shutdown open.
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, times] of buckets) {
    if (times.length === 0 || times[times.length - 1]! < now - 3600_000) {
      buckets.delete(key);
    }
  }
}, 10 * 60_000);
sweep.unref?.();

function tooMany(key: string, limit: number, windowMs: number): number {
  const now = Date.now();
  const times = (buckets.get(key) ?? []).filter((t) => t > now - windowMs);

  if (times.length >= limit) {
    buckets.set(key, times);
    // Sliding, not fixed: a fixed window lets 2x through by straddling the reset.
    return Math.max(1, Math.ceil((times[0]! + windowMs - now) / 1000));
  }

  times.push(now);
  buckets.set(key, times);
  return 0;
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  /** Defaults to the client IP. A shared NAT is many honest people; a username
   *  is one person. Those get separate limits, not one rule with two keys. */
  keys?: (c: Context) => string[];
  message?: string;
}

export function rateLimit(opts: RateLimitOptions): MiddlewareHandler {
  const {
    limit,
    windowMs,
    message = "too many attempts, try again shortly",
  } = opts;
  const keysOf = opts.keys ?? ((c: Context) => [`ip:${clientIp(c)}`]);

  return async (c, next) => {
    let worst = 0;
    for (const key of keysOf(c)) {
      worst = Math.max(worst, tooMany(`${c.req.path}|${key}`, limit, windowMs));
    }

    if (worst > 0) {
      c.header("Retry-After", String(worst));
      return c.json({ error: message }, 429);
    }
    return next();
  };
}

export function resetRateLimits() {
  buckets.clear();
}
