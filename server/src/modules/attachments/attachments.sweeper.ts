import { ServerEventType } from "@motus/shared";
import { findById } from "../../db/query.js";
import { messagesTable } from "../../db/schema";
import { ATTACHMENT_SWEEP_INTERVAL_MIN } from "../../env.js";
import { hub } from "../../hub.js";
import { toMessageView } from "../../views.js";
import { purgeExpired, purgeOrphans, reclaimStrayFiles } from "./attachments.service.js";

let scheduled = false;

/** Reclaim expired attachments and abandoned (never-sent) uploads, reconcile the
 *  directory against the DB to sweep up any file left behind, then repaint the
 *  messages that lost a file so live clients drop the card instead of showing a
 *  link that now 410s. Orphans were never attached, so they need no repaint. */
async function sweep() {
  purgeOrphans();
  await reclaimStrayFiles();
  const removed = purgeExpired();
  if (!removed.length) return;

  const messageIds = new Set(
    removed.map((r) => r.messageId).filter((id): id is string => id !== null),
  );
  for (const id of messageIds) {
    const msg = findById(messagesTable, id);
    if (msg && !msg.deleted) {
      hub.broadcast({
        type: ServerEventType.Message_Edited,
        message: toMessageView(msg),
      });
    }
  }
}

async function runSweep() {
  try {
    await sweep();
  } catch (e) {
    console.error("[attachments] sweep failed", e);
  }
}

/** Sweep on a fixed interval, plus once on boot to catch anything that expired
 *  while the server was down. 0 minutes disables the sweeper. */
export function startAttachmentSweeper() {
  if (scheduled || ATTACHMENT_SWEEP_INTERVAL_MIN <= 0) return;
  scheduled = true;

  // Deferred so a large expired backlog can't delay the server binding on boot.
  const boot = setTimeout(runSweep, 0);
  boot.unref?.();
  const timer = setInterval(runSweep, ATTACHMENT_SWEEP_INTERVAL_MIN * 60 * 1000);
  timer.unref?.();
}
