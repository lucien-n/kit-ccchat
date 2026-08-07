const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const i = Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${UNITS[i]}`;
}

const DATE_TIME_FMT = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});
const DATE_FMT = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

export function formatDate(ms: number, withTime?: boolean): string {
  const FMT = withTime ? DATE_TIME_FMT : DATE_FMT;
  return FMT.format(new Date(ms));
}

/** A signed gap from now as words, e.g. "3h ago" or "in 21h". */
export function formatRelative(ms: number): string {
  const deltaSec = Math.round((ms - Date.now()) / 1000);
  if (Math.abs(deltaSec) < 45) return "just now";
  const span = formatDuration(Math.abs(deltaSec));
  return deltaSec < 0 ? `${span} ago` : `in ${span}`;
}

/** A media position as a clock: "1:05", growing to "1:02:03" past the hour. Used
 *  by inline media players for the current-time / duration readout and scrub. */
export function formatTimecode(seconds: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(r).padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const parts: string[] = [];
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!parts.length) parts.push(`${s}s`);
  return parts.slice(0, 2).join(" ");
}
