import ipaddr from "ipaddr.js";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http, { type IncomingMessage } from "node:http";
import https from "node:https";
import { isIP, type LookupFunction } from "node:net";

/** Outbound HTTP client for unfurling user-supplied URLs - the classic SSRF
 *  surface. Two guards: (1) a guarded DNS lookup (below) so the socket only
 *  connects to a vetted-public address, with no check-then-connect rebinding
 *  gap; (2) redirects followed by hand, re-guarding each hop's scheme and any
 *  literal-IP host. Plus a timeout, size cap, and content-type allowlist. */

const MAX_REDIRECTS = 4;

// Browser UA, not a "linkbot" one: many CDNs tarpit/block unknown agents
// (minecraft.net hangs 15s+ on a custom UA, ~60ms on a browser one).
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export class UnsafeUrlError extends Error {}

/** Public routable unicast only. ipaddr.js names every special range; anything
 *  but "unicast" (loopback, private, link-local incl. cloud metadata, IPv6
 *  unique-local/multicast, IPv4-mapped, NAT64, reserved) is refused. Unparseable
 *  input throws → fail closed. */
export function isPublicAddress(ip: string): boolean {
  try {
    return ipaddr.parse(ip).range() === "unicast";
  } catch {
    return false;
  }
}

/** Gate for a resolved IP. isPublicAddress in production; injectable only so a
 *  test can reach a loopback server. */
export type AllowAddress = (ip: string) => boolean;

/** The `lookup` handed to http(s).request: resolve for real, then block the
 *  connection if any resolved address fails `allow` - the same lookup the socket
 *  uses, so no rebinding gap. Resolve `all: true` and answer in the caller's
 *  shape: Node's Happy-Eyeballs passes `all: true` and needs the whole array
 *  back (a lone address is read as the array → connect to `undefined`). */
function makeGuardedLookup(allow: AllowAddress): LookupFunction {
  return (hostname, options, cb) => {
    const opts = (options ?? {}) as { all?: boolean; family?: number; hints?: number };
    dnsLookup(hostname, { ...opts, all: true }, (err, addresses: LookupAddress[]) => {
      if (err) return cb(err, "", 0);
      if (!addresses.length) return cb(new UnsafeUrlError("no address"), "", 0);
      for (const a of addresses) {
        if (!allow(a.address)) {
          return cb(new UnsafeUrlError(`blocked address for ${hostname}`), "", 0);
        }
      }
      if (opts.all) {
        (cb as (e: NodeJS.ErrnoException | null, a: LookupAddress[]) => void)(
          null,
          addresses,
        );
      } else {
        cb(null, addresses[0].address, addresses[0].family);
      }
    });
  };
}

/** Reject before we even open a socket: only http(s), and a literal-IP host has
 *  to pass `allow` here because a literal skips DNS (so the lookup never runs). */
function assertRequestable(url: URL, allow: AllowAddress): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError(`unsupported protocol ${url.protocol}`);
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !allow(host)) {
    throw new UnsafeUrlError(`blocked literal address ${host}`);
  }
}

export interface FetchResult {
  finalUrl: string;
  contentType: string;
  body: Buffer;
}

interface FetchOpts {
  maxBytes: number;
  timeoutMs: number;
  acceptContentTypePrefixes: readonly string[];
  // Right for HTML (the head is near the top); wrong for images
  truncateDontReject?: boolean;
  stopAtHeadEnd?: boolean;
  allowAddress?: AllowAddress;
}

/** One request, no redirect handling - the caller re-validates and recurses. */
function once(
  url: URL,
  opts: FetchOpts,
  lookup: LookupFunction,
  allow: AllowAddress,
): Promise<IncomingMessage> {
  assertRequestable(url, allow);
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      url,
      {
        method: "GET",
        lookup,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,image/*;q=0.9,*/*;q=0.8",
          "accept-language": "en;q=0.9",
        },
      },
      resolve,
    );
    req.setTimeout(opts.timeoutMs, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

/** GET `startUrl`, following redirects by hand (each hop re-guarded), enforcing
 *  the timeout, size cap, and content-type allowlist. Rejects rather than
 *  returning a partial or oversize body. */
export async function safeFetch(startUrl: string, opts: FetchOpts): Promise<FetchResult> {
  const allow = opts.allowAddress ?? isPublicAddress;
  const lookup = makeGuardedLookup(allow);

  let current: URL;
  try {
    current = new URL(startUrl);
  } catch {
    throw new UnsafeUrlError("invalid url");
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await once(current, opts, lookup, allow);
    const status = res.statusCode ?? 0;
    const location = res.headers.location;

    if (status >= 300 && status < 400 && location) {
      res.resume(); // drain so the socket can be reused/closed
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new UnsafeUrlError("invalid redirect target");
      }
      current = next; // assertRequestable runs on the next `once`
      continue;
    }

    if (status !== 200) {
      res.resume();
      throw new Error(`unexpected status ${status}`);
    }

    const contentType = String(res.headers["content-type"] ?? "").toLowerCase();
    if (!opts.acceptContentTypePrefixes.some((p) => contentType.startsWith(p))) {
      res.resume();
      throw new UnsafeUrlError(`disallowed content-type ${contentType || "(none)"}`);
    }

    return await new Promise<FetchResult>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      let tail = "";
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve({
          finalUrl: current.toString(),
          contentType,
          body: Buffer.concat(chunks),
        });
      };
      const fail = (e: Error) => {
        if (settled) return;
        settled = true;
        reject(e);
      };

      res.on("data", (chunk: Buffer) => {
        if (settled) return;
        chunks.push(chunk);
        size += chunk.length;

        // Latin1 keeps byte offsets 1:1 so a tag split across chunks is still
        // caught via the carried tail; we only need to spot the ASCII `</head>`.
        if (opts.stopAtHeadEnd) {
          const hay = (tail + chunk.toString("latin1")).toLowerCase();
          if (hay.includes("</head>")) {
            res.destroy();
            return finish();
          }
          tail = hay.slice(-8);
        }

        if (size >= opts.maxBytes) {
          res.destroy();
          if (opts.truncateDontReject) return finish();
          return fail(new Error("response too large"));
        }
      });
      res.on("end", finish);
      res.on("error", fail);
    });
  }

  throw new UnsafeUrlError("too many redirects");
}
