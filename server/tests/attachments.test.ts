import { ChannelType } from "@motus/shared";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, cleanup } from "./harness.js";

// A minimal PNG header so the server sniffs the upload as a real image.
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48,
  0x44, 0x52,
]);

const HOUR = 60 * 60 * 1000;

describe("attachments cleanup", () => {
  let db: any;
  let schema: any;
  let service: any;
  let safePathOf: (dir: string, id: string) => string | null;
  let ATTACHMENTS_DIR: string;

  beforeAll(async () => {
    await boot();
    ({ db } = await import("../src/db/index.js"));
    schema = await import("../src/db/schema/index.js");
    service = await import("../src/modules/attachments/attachments.service.js");
    ({ safePathOf } = await import("../src/blob.js"));
    ({ ATTACHMENTS_DIR } = await import("../src/env.js"));

    const now = Date.now();
    db.insert(schema.channelsTable)
      .values({ id: "c1", name: "general", type: ChannelType.Text, createdAt: now })
      .run();
    db.insert(schema.messagesTable)
      .values({
        id: "m1",
        channelId: "c1",
        authorId: "u1",
        content: "hi",
        createdAt: now,
      })
      .run();
  });

  afterAll(cleanup);

  async function upload() {
    return service.saveAttachment(
      "u1",
      { filename: "pic.png", mime: "image/png", width: 4, height: 4 },
      new Response(PNG).body,
    );
  }

  it("removes the row and file when the owning message is deleted", async () => {
    const att = await upload();
    const path = safePathOf(ATTACHMENTS_DIR, att.id)!;
    expect(existsSync(path)).toBe(true);

    service.attachMessage("m1", "u1", [att.id]);
    expect(service.attachmentsOf("m1")).toHaveLength(1);

    service.deleteAttachmentsOf("m1");
    await sleep(50); // removeFile is fire-and-forget

    expect(service.attachmentsOf("m1")).toHaveLength(0);
    expect(existsSync(path)).toBe(false);
  });

  it("reclaims a stray file that no row references, once past the grace window", async () => {
    const strayPath = join(ATTACHMENTS_DIR, crypto.randomUUID());
    await writeFile(strayPath, "orphaned bytes");
    expect(existsSync(strayPath)).toBe(true);

    // Within the grace window it is left alone (could be a live upload).
    expect(await service.reclaimStrayFiles(Date.now())).toBe(0);
    expect(existsSync(strayPath)).toBe(true);

    // Past the grace window it is reaped.
    const removed = await service.reclaimStrayFiles(Date.now() + 2 * HOUR);
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(existsSync(strayPath)).toBe(false);
  });

  it("never reclaims a file a row still references", async () => {
    const att = await upload();
    service.attachMessage("m1", "u1", [att.id]);
    const path = safePathOf(ATTACHMENTS_DIR, att.id)!;

    // Even far past the grace window, a referenced file is kept.
    await service.reclaimStrayFiles(Date.now() + 100 * HOUR);
    expect(existsSync(path)).toBe(true);
  });
});
