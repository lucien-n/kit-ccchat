import { clampChroma, formatHex, oklch, wcagLuminance } from "culori";

const TARGET_CONTRAST = 3.5;
const MIN_L = 0.02;
const MAX_L = 0.99;

export function luminanceOf(cssColor: string): number {
  const value = wcagLuminance(cssColor);
  return Number.isFinite(value) ? value : 0;
}

function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const cache = new Map<string, string>();

export function legibleColor(
  color: string | null,
  bgLuminance: number,
): string | undefined {
  if (!color) return undefined;

  const key = `${color}|${bgLuminance}`;
  let hit = cache.get(key);
  if (hit === undefined) cache.set(key, (hit = adjust(color, bgLuminance)));
  return hit;
}

function adjust(color: string, bgLuminance: number): string {
  const target = oklch(color);
  if (!target) return color;
  if (contrast(luminanceOf(color), bgLuminance) >= TARGET_CONTRAST) return color;

  const step = bgLuminance < 0.4 ? 0.02 : -0.02;
  let candidate = clampChroma(target, "oklch");

  while (
    contrast(wcagLuminance(candidate), bgLuminance) < TARGET_CONTRAST &&
    target.l > MIN_L &&
    target.l < MAX_L
  ) {
    target.l = Math.min(MAX_L, Math.max(MIN_L, target.l + step));
    candidate = clampChroma(target, "oklch");
  }

  return formatHex(candidate);
}
