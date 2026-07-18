import type { SystemStats } from "@ccchat/shared";
import { statfs } from "node:fs/promises";
import os from "node:os";
import { DATA_DIR } from "./env.js";

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

export async function collectSystemStats(): Promise<SystemStats> {
  startSystemSampler();
  const totalmem = os.totalmem();
  const freemem = os.freemem();
  const cpus = os.cpus();
  const [one, five, fifteen] = os.loadavg();
  const latest = history[history.length - 1];

  let disk = { totalBytes: 0, usedBytes: 0, freeBytes: 0 };
  try {
    const fs = await statfs(DATA_DIR);
    const total = fs.blocks * fs.bsize;
    const free = fs.bavail * fs.bsize;
    disk = { totalBytes: total, freeBytes: free, usedBytes: total - free };
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
