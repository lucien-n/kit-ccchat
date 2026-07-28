import { clampChroma, formatHex, oklch, wcagLuminance } from "culori";

const TARGET_CONTRAST = 3.5;

export function luminanceOf(cssColor: string): number {
  const value = wcagLuminance(cssColor);
  return Number.isFinite(value) ? value : 0;
}

function contrast(colorLum: number, bgLum: number): number {
  const [brighter, darker] = colorLum > bgLum ? [colorLum, bgLum] : [bgLum, colorLum];
  return (brighter + 0.05) / (darker + 0.05);
}

const cache = new Map<string, string>();

export function legibleColor(
  color: string | null,
  bgLuminance: number,
): string | undefined {
  if (!color) return undefined;

  const key = `${color}|${bgLuminance}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const result = adjust(color, bgLuminance);
  cache.set(key, result);
  return result;
}

function adjust(color: string, bgLuminance: number): string {
  const target = oklch(color);
  if (!target) return color;

  if (contrast(luminanceOf(color), bgLuminance) >= TARGET_CONTRAST) return color;

  // Push away from the background: lighten on dark themes, darken on light ones.
  const step = bgLuminance < 0.4 ? 0.02 : -0.02;

  // Pull the color back into the sRGB gamut by trimming chroma, so lightening a
  // vivid hue doesn't clip its channels and shift the hue.
  let candidate = clampChroma(target, "oklch");
  for (let attempt = 0; attempt < 48; attempt++) {
    if (contrast(wcagLuminance(candidate), bgLuminance) >= TARGET_CONTRAST) break;
    if (target.l <= 0.02 || target.l >= 0.99) break;
    target.l = Math.max(0.02, Math.min(0.99, target.l + step));
    candidate = clampChroma(target, "oklch");
  }
  return formatHex(candidate);
}
