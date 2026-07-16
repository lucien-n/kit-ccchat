import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context, MiddlewareHandler } from "hono";

/** Who to blame for a request.
 *
 *  Caddy is the only way in (the app port isn't published), and it *appends* the
 *  real peer to any X-Forwarded-For the client sent. So the LAST entry is the
 *  one our proxy vouched for. The leftmost is whatever the caller made up —
 *  reading that would let anyone dodge the limit with a header. With no proxy
 *  (`npm run dev`) there's no XFF and the socket address is the truth.
 */
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

/** timestamps of recent hits, per bucket key */
const buckets = new Map<string, Time[]>();

/** Sweep so a caller rotating keys can't grow the map without bound. unref so a
 *  test run — or a clean shutdown — isn't held open by a timer. */
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, times] of buckets) {
    // The longest window in use; anything older can't matter to any limiter.
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
    // A sliding window, not a fixed one: a fixed window lets 2x the limit
    // through by straddling the reset.
    return Math.max(1, Math.ceil((times[0]! + windowMs - now) / 1000));
  }

  times.push(now);
  buckets.set(key, times);
  return 0;
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  /** What to count against. Defaults to the client IP.
   *
   *  Per-IP and per-account limits guard different things and want different
   *  numbers — a shared NAT is many honest people, one username is one person —
   *  so they're separate middlewares rather than one rule with two keys. */
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

/** Tests need a clean slate between cases. */
export function resetRateLimits() {
  buckets.clear();
}
