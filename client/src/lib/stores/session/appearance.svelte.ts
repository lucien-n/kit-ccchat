import { api, authToken } from "$lib/api";
import {
  CUSTOM_THEME_DEFAULTS,
  CUSTOM_THEME_VARS,
  deriveCustomTheme,
  isDarkBackground,
  legibleColor,
  luminanceOf,
} from "$lib/color";
import {
  customTheme,
  Theme,
  ThemeMode,
  type AppearanceView,
  type CustomTheme,
} from "@motus/shared";

// Re-exported so components can keep importing the enums from the store.
export { Theme, ThemeMode };

const CUSTOM_THEME_KEY = "appearance:customTheme";

const emptyCustomTheme = (): CustomTheme => ({
  primary: null,
  background: null,
  radius: null,
});

class Appearance {
  mode = $state<ThemeMode>(ThemeMode.Dark);
  theme = $state<Theme>(Theme.Default);
  reducedMotion = $state(false);

  customTheme = $state<CustomTheme>(emptyCustomTheme());

  bgLuminance = $state(0.1);

  /** The custom theme with every unset field filled from the defaults, so the
   *  derivation and the color inputs always have concrete values to work with. */
  get effectiveTheme(): { primary: string; background: string; radius: number } {
    return {
      primary: this.customTheme.primary ?? CUSTOM_THEME_DEFAULTS.primary,
      background: this.customTheme.background ?? CUSTOM_THEME_DEFAULTS.background,
      radius: this.customTheme.radius ?? CUSTOM_THEME_DEFAULTS.radius,
    };
  }

  private media: MediaQueryList | null = null;
  private motionMedia: MediaQueryList | null = null;

  /** True when motion should be reduced, from either the explicit setting or the
   *  OS preference. The OS acts as a floor: it can force reduction on. */
  get motionReduced() {
    return this.reducedMotion || (this.motionMedia?.matches ?? false);
  }

  /** Inline `style` for a name rendered in its own color, nudged to stay legible
   *  against the current theme. Returns undefined (so the attribute drops) when
   *  there is no color. Reads bgLuminance, so it re-runs when the theme changes. */
  nameStyle(color: string | null): string | undefined {
    const legible = legibleColor(color, this.bgLuminance);
    return legible ? `color:${legible}` : undefined;
  }

  init() {
    this.media = window.matchMedia("(prefers-color-scheme: dark)");
    this.motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");

    this.mode = (localStorage.getItem("appearance:mode") as ThemeMode) ?? ThemeMode.Dark;

    this.theme = (localStorage.getItem("appearance:theme") as Theme) ?? Theme.Default;

    this.reducedMotion = localStorage.getItem("appearance:reducedMotion") === "1";

    this.customTheme = readStoredCustomTheme();

    this.applyTheme();
    this.applyMotion();

    this.media.addEventListener("change", () => {
      if (this.mode === "system") this.applyTheme();
    });

    this.motionMedia.addEventListener("change", () => this.applyMotion());
  }

  setMode(mode: ThemeMode) {
    this.mode = mode;
    localStorage.setItem("appearance:mode", mode);
    this.applyTheme();
    this.persist();
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
    localStorage.setItem("appearance:reducedMotion", value ? "1" : "0");
    this.applyMotion();
    this.persist();
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    localStorage.setItem("appearance:theme", theme);
    this.applyTheme();
    this.persist();
  }

  setCustomPrimary(color: string) {
    this.updateCustomTheme({ primary: color });
  }

  setCustomBackground(color: string) {
    this.updateCustomTheme({ background: color });
  }

  setCustomRadius(radius: number) {
    this.updateCustomTheme({ radius });
  }

  private updateCustomTheme(patch: Partial<CustomTheme>) {
    this.customTheme = { ...this.customTheme, ...patch };
    this.writeCustomStorage();
    this.applyTheme();
    this.persist();
  }

  hydrate(prefs: AppearanceView) {
    this.mode = prefs.mode;
    this.theme = prefs.theme;
    this.reducedMotion = prefs.reducedMotion;
    this.customTheme = prefs.customTheme;
    localStorage.setItem("appearance:mode", prefs.mode);
    localStorage.setItem("appearance:theme", prefs.theme);
    localStorage.setItem("appearance:reducedMotion", prefs.reducedMotion ? "1" : "0");
    this.writeCustomStorage();
    this.applyTheme();
    this.applyMotion();
  }

  /** Mirror the custom theme into localStorage so the pre-login screen (which
   *  themes before the server responds) matches the account. */
  private writeCustomStorage() {
    localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(this.customTheme));
  }

  /** Push the current prefs to the server, fire-and-forget. Skipped while logged
   *  out (the login screen still themes from localStorage). */
  private persist() {
    if (!authToken.value) return;
    void api.users
      .setAppearance({
        mode: this.mode,
        theme: this.theme,
        reducedMotion: this.reducedMotion,
        customTheme: this.customTheme,
      })
      .catch(() => {});
  }

  private prefersDark() {
    return this.mode === "dark" || (this.mode === "system" && this.media?.matches);
  }

  private applyTheme() {
    const html = document.documentElement;

    html.dataset.theme = this.theme;

    if (this.theme === Theme.Custom) {
      const { primary, background, radius } = this.effectiveTheme;
      const tokens = deriveCustomTheme(primary, background, radius);
      for (const [name, value] of Object.entries(tokens))
        html.style.setProperty(name, value);
      // The chosen background defines light-vs-dark, so drive `.dark` off it
      // rather than the mode toggle while a custom theme is active.
      html.classList.toggle("dark", isDarkBackground(background));
    } else {
      for (const name of CUSTOM_THEME_VARS) html.style.removeProperty(name);
      html.classList.toggle("dark", this.prefersDark());
    }

    this.measureBackground();
  }

  private measureBackground() {
    requestAnimationFrame(() => {
      this.bgLuminance = luminanceOf(getComputedStyle(document.body).backgroundColor);
    });
  }

  private applyMotion() {
    document.documentElement.classList.toggle("reduce-motion", this.motionReduced);
  }
}

/** Read the persisted custom theme, tolerating absent or malformed storage by
 *  falling back to an all-null theme. */
function readStoredCustomTheme(): CustomTheme {
  const raw = localStorage.getItem(CUSTOM_THEME_KEY);
  if (!raw) return emptyCustomTheme();

  try {
    const parsed = customTheme.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyCustomTheme();
  } catch {
    return emptyCustomTheme();
  }
}

export const appearance = new Appearance();
