import { DiskItem, type SystemStats } from "@ccchat/shared";
import { readdir, stat, statfs } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import { AVATARS_DIR, DATA_DIR, DB_FILE, IMAGES_DIR } from "../../env.js";

const SAMPLE_INTERVAL_SEC = 5;
const HISTORY_SIZE = 180;

type Sample = { t: number; cpuPct: number; memPct: number };

const history: Sample[] = [];
let lastCpu = cpuTimes();
let timer: ReturnType<typeof setInterval> | null = null;

function cpuTimes() {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    for (const t of Object.values(cpu.times)) total += t;
    idle += cpu.times.idle;
  }
  return { idle, total };
}

function cpuPctSince(prev: { idle: number; total: number }) {
  const now = cpuTimes();
  const total = now.total - prev.total;
  const pct = total > 0 ? Math.round((1 - (now.idle - prev.idle) / total) * 100) : 0;
  return { pct, now };
}

function takeSample() {
  const { pct, now } = cpuPctSince(lastCpu);
  lastCpu = now;
  const memPct = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
  history.push({ t: Date.now(), cpuPct: pct, memPct });
  if (history.length > HISTORY_SIZE) history.shift();
}

export function startSystemSampler() {
  if (timer) return;
  lastCpu = cpuTimes();
  timer = setInterval(takeSample, SAMPLE_INTERVAL_SEC * 1000);
  timer.unref?.(); // must not hold the process (or a test run) open
}

// Cold-start value before the sampler has its first point.
async function cpuPctOnce(sampleMs = 200): Promise<number> {
  const a = cpuTimes();
  await new Promise((r) => setTimeout(r, sampleMs));
  return cpuPctSince(a).pct;
}

/** WAL mode keeps the journal and shared-memory files beside the database, and
 *  the journal alone can outgrow it between checkpoints. */
const DISK_ITEM_PATH_MAP: Record<DiskItem, string[]> = {
  [DiskItem.AvatarDir]: [AVATARS_DIR],
  [DiskItem.ImagesDir]: [IMAGES_DIR],
  [DiskItem.DatabaseFile]: [DB_FILE, `${DB_FILE}-wal`, `${DB_FILE}-shm`],
};

/** Walking the image tree costs one stat per file, and the panel polls every
 *  five seconds, so the sizes are cached well past the poll interval. */
const DISK_ITEM_TTL_MS = 60_000;

let diskItems: { at: number; sizes: Promise<Record<DiskItem, number>> } | null = null;

function measureDiskItems(): Promise<Record<DiskItem, number>> {
  if (diskItems && Date.now() - diskItems.at < DISK_ITEM_TTL_MS) return diskItems.sizes;

  const sizes = Promise.all(
    Object.values(DiskItem).map(async (diskItem) => {
      const parts = await Promise.all(DISK_ITEM_PATH_MAP[diskItem].map(pathBytes));
      return [diskItem, parts.reduce((total, size) => total + size, 0)] as const;
    }),
  ).then((entries) => Object.fromEntries(entries) as Record<DiskItem, number>);

  diskItems = { at: Date.now(), sizes };
  return sizes;
}

async function pathBytes(path: string): Promise<number> {
  try {
    const entry = await stat(path);
    if (!entry.isDirectory()) {
      return entry.size;
    }

    const names = await readdir(path);
    const sizes = await Promise.all(names.map((name) => pathBytes(join(path, name))));

    return sizes.reduce((total, size) => total + size, 0);
  } catch {
    return 0;
  }
}

export async function collectSystemStats(): Promise<SystemStats> {
  startSystemSampler();
  const totalmem = os.totalmem();
  const freemem = os.freemem();
  const cpus = os.cpus();
  const [one, five, fifteen] = os.loadavg();
  const latest = history[history.length - 1];

  const disk: SystemStats["disk"] = {
    totalBytes: 0,
    freeBytes: 0,
    usedBytes: 0,
    usedByItem: await measureDiskItems(),
  };
  try {
    const fs = await statfs(DATA_DIR);
    disk.totalBytes = fs.blocks * fs.bsize;
    disk.freeBytes = fs.bavail * fs.bsize;
    disk.usedBytes = disk.totalBytes - disk.freeBytes;
  } catch {
    /* empty */
  }

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    uptimeSec: Math.round(os.uptime()),
    cpu: {
      model: cpus[0]?.model.trim() ?? "unknown",
      cores: cpus.length,
      loadAvg: [one, five, fifteen],
      usagePct: latest ? latest.cpuPct : await cpuPctOnce(),
    },
    memory: {
      totalBytes: totalmem,
      freeBytes: freemem,
      usedBytes: totalmem - freemem,
    },
    disk,
    app: {
      uptimeSec: Math.round(process.uptime()),
      rssBytes: process.memoryUsage().rss,
    },
    history: history.slice(),
    sampleIntervalSec: SAMPLE_INTERVAL_SEC,
  };
}
