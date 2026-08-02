import { clampChroma, formatHex, oklch, wcagLuminance } from "culori";

/** Sensible starting points when the user opens the custom theme with nothing
 *  saved yet. A dark, near-neutral background and an indigo primary. */
export const CUSTOM_THEME_DEFAULTS = {
  primary: "#6366f1",
  background: "#111114",
  radius: 0.625,
} as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Whether a background color reads as dark, by the same lightness cut the
 *  palette derivation uses. Lets the app flip the `.dark` class to match a
 *  custom background so Tailwind `dark:` variants stay in step. */
export function isDarkBackground(color: string): boolean {
  const parsed = oklch(color);
  return parsed ? parsed.l < 0.5 : false;
}

/** Build an oklch color at a given lightness, reusing a hue and (subtle) chroma,
 *  clamped back into sRGB gamut and returned as a hex string. */
function shade(hue: number, chroma: number, lightness: number): string {
  return formatHex(
    clampChroma({ mode: "oklch", l: clamp01(lightness), c: chroma, h: hue }, "oklch"),
  );
}

/** The CSS custom properties the custom theme drives. Exported so the appearance
 *  store can clear exactly these when switching back to a preset. */
export const CUSTOM_THEME_VARS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--border",
  "--input",
  "--ring",
  "--sidebar",
  "--sidebar-foreground",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
  "--sidebar-ring",
  "--radius",
] as const;

/** Derive a full palette from just a primary color, a background color and a
 *  corner radius. The background's lightness decides light-vs-dark; its hue
 *  tints the whole neutral ramp so surfaces feel of a piece. Foregrounds are
 *  picked for contrast rather than exposed as knobs, so the result stays
 *  legible whatever the user chooses. Returns `--var` → value pairs. */
export function deriveCustomTheme(
  primary: string,
  background: string,
  radius: number,
): Record<string, string> {
  const bg = oklch(background);
  const prim = oklch(primary);
  if (!bg || !prim) return {};

  const hue = bg.h ?? 0;
  const baseLightness = bg.l;
  // Below mid-lightness we treat the theme as dark: surfaces step lighter, text
  // goes near-white. Above, the reverse.
  const dark = baseLightness < 0.5;
  const dir = dark ? 1 : -1;
  // Keep only a whisper of the background's chroma in the neutrals, so a tinted
  // background reads as tinted grey rather than a saturated wash.
  const neutralChroma = Math.min(bg.c ?? 0, 0.02);

  const neutral = (offset: number) =>
    shade(hue, neutralChroma, baseLightness + dir * offset);
  const foreground = shade(hue, neutralChroma, dark ? 0.985 : 0.205);
  const mutedForeground = shade(hue, neutralChroma, dark ? 0.715 : 0.556);

  // Primary sits on its own hue; its foreground flips to whichever end stays
  // readable on top of it.
  const primaryForeground = shade(
    prim.h ?? hue,
    0.01,
    luminanceOf(primary) < 0.4 ? 0.985 : 0.205,
  );

  // A fixed, mode-aware red so destructive actions never blend into the theme.
  const destructive = dark ? "oklch(0.704 0.191 22.216)" : "oklch(0.577 0.245 27.325)";

  const surface = neutral(0.04);
  const raised = neutral(0.03);
  const subtle = neutral(0.08);
  const border = neutral(0.11);

  return {
    "--background": background,
    "--foreground": foreground,
    "--card": surface,
    "--card-foreground": foreground,
    "--popover": surface,
    "--popover-foreground": foreground,
    "--primary": primary,
    "--primary-foreground": primaryForeground,
    "--secondary": subtle,
    "--secondary-foreground": foreground,
    "--muted": subtle,
    "--muted-foreground": mutedForeground,
    "--accent": subtle,
    "--accent-foreground": foreground,
    "--destructive": destructive,
    "--border": border,
    "--input": border,
    "--ring": primary,
    "--sidebar": raised,
    "--sidebar-foreground": foreground,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": primaryForeground,
    "--sidebar-accent": subtle,
    "--sidebar-accent-foreground": foreground,
    "--sidebar-border": border,
    "--sidebar-ring": primary,
    "--radius": `${radius}rem`,
  };
}

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
