import type { Hono } from "hono";
import http from "node:http";
import type { AddressInfo } from "node:net";
// Imported first so its module-level side effects point DATA_DIR at a temp dir
// before the service module (which opens the db) is evaluated below.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  embedsOf,
  extractUrls,
  markEmbedRemoved,
} from "../src/modules/link-embeds/link-embeds.service.js";
import { parseOpenGraph } from "../src/modules/link-embeds/open-graph.js";
import {
  isPublicAddress,
  safeFetch,
  UnsafeUrlError,
} from "../src/modules/link-embeds/safe-fetch.js";
import { boot, cleanup, get } from "./harness.js";

const LIMITS = {
  maxBytes: 1000,
  timeoutMs: 1000,
  acceptContentTypePrefixes: ["text/html"] as const,
};

describe("isPublicAddress (SSRF address guard)", () => {
  it.each([
    "127.0.0.1", // loopback
    "10.0.0.5", // private
    "192.168.1.1", // private
    "172.16.0.1", // private
    "169.254.169.254", // link-local / cloud metadata
    "100.64.0.1", // carrier-grade NAT
    "0.0.0.0", // "this" network
    "224.0.0.1", // multicast
    "::1", // IPv6 loopback
    "fe80::1", // IPv6 link-local
    "fc00::1", // IPv6 unique-local
    "::ffff:127.0.0.1", // IPv4-mapped loopback
    "64:ff9b::7f00:1", // NAT64-mapped 127.0.0.1
    "not-an-ip", // fail closed on a non-address
  ])("blocks %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each([
    "1.1.1.1",
    "8.8.8.8",
    "93.184.216.34", // example.com
    "2606:4700:4700::1111", // public IPv6
  ])("allows %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });
});

describe("safeFetch rejects unsafe targets before connecting", () => {
  it("rejects a non-http(s) scheme", async () => {
    await expect(safeFetch("ftp://example.com/x", LIMITS)).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
  });

  it("rejects a literal loopback address", async () => {
    await expect(safeFetch("http://127.0.0.1/", LIMITS)).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
  });

  it("rejects the cloud metadata address", async () => {
    await expect(
      safeFetch("http://169.254.169.254/latest/meta-data/", LIMITS),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("rejects a malformed url", async () => {
    await expect(safeFetch("not a url", LIMITS)).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});

describe("extractUrls", () => {
  it("pulls http(s) urls in order", () => {
    expect(extractUrls("a https://a.com/x then http://b.org y")).toEqual([
      "https://a.com/x",
      "http://b.org",
    ]);
  });

  it("trims trailing sentence punctuation", () => {
    expect(extractUrls("see https://x.com/page.")).toEqual(["https://x.com/page"]);
  });

  it("dedupes repeated links", () => {
    expect(extractUrls("https://a.com https://a.com")).toEqual(["https://a.com"]);
  });

  it("caps at three", () => {
    const urls = extractUrls(
      "https://1.com https://2.com https://3.com https://4.com https://5.com",
    );
    expect(urls).toHaveLength(3);
  });

  it("ignores non-http schemes and plain text", () => {
    expect(extractUrls("ftp://x ssh://y just words")).toEqual([]);
  });
});

describe("parseOpenGraph", () => {
  it("reads the OG tags and resolves a relative image", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Hello World">
        <meta property="og:description" content="A nice page">
        <meta property="og:site_name" content="Example">
        <meta property="og:image" content="/thumb.png">
      </head></html>`;
    const og = parseOpenGraph(html, "https://example.com/post");
    expect(og.title).toBe("Hello World");
    expect(og.description).toBe("A nice page");
    expect(og.siteName).toBe("Example");
    expect(og.imageUrl).toBe("https://example.com/thumb.png");
  });

  it("falls back to <title> and decodes entities", () => {
    const html = "<head><title>A &amp; B</title></head>";
    const og = parseOpenGraph(html, "https://example.com/");
    expect(og.title).toBe("A & B");
    expect(og.description).toBeNull();
    expect(og.imageUrl).toBeNull();
  });

  it("prefers twitter tags over the bare <title>", () => {
    const html = `
      <head>
        <title>fallback</title>
        <meta name="twitter:title" content="Card Title">
      </head>`;
    expect(parseOpenGraph(html, "https://x.com/").title).toBe("Card Title");
  });
});

describe("safeFetch end-to-end", () => {
  let server: http.Server;
  let base: string;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      switch (req.url) {
        case "/html":
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          return res.end("<title>Hi</title>");
        case "/redirect":
          res.writeHead(302, { location: "/html" });
          return res.end();
        case "/big":
          res.writeHead(200, { "content-type": "text/html" });
          return res.end("x".repeat(10_000));
        case "/json":
          res.writeHead(200, { "content-type": "application/json" });
          return res.end("{}");
        default:
          res.writeHead(404);
          return res.end();
      }
    });
    // No host: bind dual-stack so a `localhost` that resolves to ::1 or 127.0.0.1
    // both reach it - the point is to drive the *hostname* lookup path.
    await new Promise<void>((resolve) => server.listen(0, resolve));
    base = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  // allowAddress bypasses the private-range block so the fetcher can reach the
  // loopback test server; everything else (the guarded lookup's array-shape
  // handling, redirects, caps) is exercised for real.
  const open = {
    maxBytes: 1_000_000,
    timeoutMs: 3_000,
    acceptContentTypePrefixes: ["text/html"] as const,
    allowAddress: () => true,
  };

  it("fetches through the guarded lookup (Happy-Eyeballs array shape)", async () => {
    const res = await safeFetch(`${base}/html`, open);
    expect(res.body.toString()).toContain("<title>Hi</title>");
    expect(res.contentType).toContain("text/html");
  });

  it("follows redirects to the final url", async () => {
    const res = await safeFetch(`${base}/redirect`, open);
    expect(res.finalUrl).toBe(`${base}/html`);
    expect(res.body.toString()).toContain("Hi");
  });

  it("rejects an over-cap body", async () => {
    await expect(safeFetch(`${base}/big`, { ...open, maxBytes: 100 })).rejects.toThrow(
      /too large/,
    );
  });

  it("truncates instead of failing when asked (the HTML path)", async () => {
    // What lets a >1MB page like YouTube still unfurl: keep what we read rather
    // than rejecting once the cap is hit.
    const res = await safeFetch(`${base}/big`, {
      ...open,
      maxBytes: 100,
      truncateDontReject: true,
    });
    expect(res.body.length).toBeGreaterThanOrEqual(100);
    expect(res.body.toString()).toMatch(/^x+$/);
  });

  it("rejects a disallowed content-type", async () => {
    await expect(safeFetch(`${base}/json`, open)).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks a hostname that resolves to a private address (default guard)", async () => {
    // No allowAddress: localhost -> loopback, which isPublicAddress rejects. This
    // is the DNS-rebinding protection working through the real lookup.
    await expect(
      safeFetch(`${base}/html`, {
        maxBytes: 1_000,
        timeoutMs: 3_000,
        acceptContentTypePrefixes: ["text/html"],
      }),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});

describe("booted server", () => {
  let app: Hono<any>;
  beforeAll(async () => {
    app = await boot();
  });
  afterAll(cleanup);

  it("404s an unknown embed id at the image proxy", async () => {
    const res = await get(app, "/api/embeds/00000000-0000-0000-0000-000000000000/image");
    expect(res.status).toBe(404);
  });

  describe("embed removal (soft-delete)", () => {
    beforeAll(async () => {
      const { db } = await import("../src/db/index.js");
      const { channelsTable, messagesTable, messageEmbedsTable } = await import(
        "../src/db/schema/index.js"
      );
      db.insert(channelsTable)
        .values({ id: "c-rm", name: "general", createdAt: Date.now() })
        .run();
      db.insert(messagesTable)
        .values({
          id: "m-rm",
          channelId: "c-rm",
          authorId: "u-rm",
          content: "two links",
          createdAt: Date.now(),
        })
        .run();
      const embed = (id: string, position: number) => ({
        id,
        messageId: "m-rm",
        url: `https://e${position}.example`,
        position,
        createdAt: Date.now(),
      });
      db.insert(messageEmbedsTable).values([embed("e1", 0), embed("e2", 1)]).run();
    });

    it("drops a dismissed embed from embedsOf, keeping the rest in order", () => {
      expect(embedsOf("m-rm").map((e) => e.id)).toEqual(["e1", "e2"]);
      expect(markEmbedRemoved("e1", "m-rm")).toBe(true);
      expect(embedsOf("m-rm").map((e) => e.id)).toEqual(["e2"]);
    });

    it("is idempotent and scoped to its message", () => {
      expect(markEmbedRemoved("e1", "m-rm")).toBe(false); // already dismissed
      expect(markEmbedRemoved("e2", "other-msg")).toBe(false); // wrong message
      expect(embedsOf("m-rm").map((e) => e.id)).toEqual(["e2"]);
    });
  });
});
