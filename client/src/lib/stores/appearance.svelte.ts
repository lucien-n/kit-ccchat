import { api, authToken } from "$lib/api";
import {
  CUSTOM_THEME_DEFAULTS,
  CUSTOM_THEME_VARS,
  deriveCustomTheme,
  isDarkBackground,
  legibleColor,
  luminanceOf,
} from "$lib/color";
import { Theme, ThemeMode, type AppearanceView } from "@ccchat/shared";

// Re-exported so components can keep importing the enums from the store.
export { Theme, ThemeMode };

class Appearance {
  mode = $state<ThemeMode>(ThemeMode.Dark);
  theme = $state<Theme>(Theme.Default);
  reducedMotion = $state(false);

  // Inputs for the custom theme. null = not yet chosen; the getters below fall
  // back to sensible defaults so the pickers always have something to show.
  customPrimary = $state<string | null>(null);
  customBackground = $state<string | null>(null);
  customRadius = $state<number | null>(null);

  bgLuminance = $state(0.1);

  get effectivePrimary() {
    return this.customPrimary ?? CUSTOM_THEME_DEFAULTS.primary;
  }
  get effectiveBackground() {
    return this.customBackground ?? CUSTOM_THEME_DEFAULTS.background;
  }
  get effectiveRadius() {
    return this.customRadius ?? CUSTOM_THEME_DEFAULTS.radius;
  }

  private media: MediaQueryList | null = null;

  /** Inline `style` for a name rendered in its own color, nudged to stay legible
   *  against the current theme. Returns undefined (so the attribute drops) when
   *  there is no color. Reads bgLuminance, so it re-runs when the theme changes. */
  nameStyle(color: string | null): string | undefined {
    const legible = legibleColor(color, this.bgLuminance);
    return legible ? `color:${legible}` : undefined;
  }

  init() {
    this.media = window.matchMedia("(prefers-color-scheme: dark)");

    this.mode = (localStorage.getItem("appearance:mode") as ThemeMode) ?? ThemeMode.Dark;

    this.theme = (localStorage.getItem("appearance:theme") as Theme) ?? Theme.Default;

    this.reducedMotion = localStorage.getItem("appearance:reducedMotion") === "1";

    this.customPrimary = localStorage.getItem("appearance:customPrimary");
    this.customBackground = localStorage.getItem("appearance:customBackground");
    const storedRadius = localStorage.getItem("appearance:customRadius");
    this.customRadius = storedRadius === null ? null : Number(storedRadius);

    this.applyTheme();
    this.applyMotion();

    this.media.addEventListener("change", () => {
      if (this.mode === "system") this.applyTheme();
    });
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
    this.customPrimary = color;
    localStorage.setItem("appearance:customPrimary", color);
    this.applyTheme();
    this.persist();
  }

  setCustomBackground(color: string) {
    this.customBackground = color;
    localStorage.setItem("appearance:customBackground", color);
    this.applyTheme();
    this.persist();
  }

  setCustomRadius(radius: number) {
    this.customRadius = radius;
    localStorage.setItem("appearance:customRadius", String(radius));
    this.applyTheme();
    this.persist();
  }

  hydrate(prefs: AppearanceView) {
    this.mode = prefs.mode;
    this.theme = prefs.theme;
    this.reducedMotion = prefs.reducedMotion;
    this.customPrimary = prefs.customPrimary;
    this.customBackground = prefs.customBackground;
    this.customRadius = prefs.customRadius;
    localStorage.setItem("appearance:mode", prefs.mode);
    localStorage.setItem("appearance:theme", prefs.theme);
    localStorage.setItem("appearance:reducedMotion", prefs.reducedMotion ? "1" : "0");
    this.syncCustomStorage();
    this.applyTheme();
    this.applyMotion();
  }

  /** Mirror the custom-theme inputs into localStorage so the pre-login screen
   *  (which themes before the server responds) matches the account. */
  private syncCustomStorage() {
    const entries: [string, string | null][] = [
      ["appearance:customPrimary", this.customPrimary],
      ["appearance:customBackground", this.customBackground],
      ["appearance:customRadius", this.customRadius === null ? null : String(this.customRadius)],
    ];
    for (const [key, value] of entries) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
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
        customPrimary: this.customPrimary,
        customBackground: this.customBackground,
        customRadius: this.customRadius,
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
      const tokens = deriveCustomTheme(
        this.effectivePrimary,
        this.effectiveBackground,
        this.effectiveRadius,
      );
      for (const [name, value] of Object.entries(tokens)) html.style.setProperty(name, value);
      // The chosen background defines light-vs-dark, so drive `.dark` off it
      // rather than the mode toggle while a custom theme is active.
      html.classList.toggle("dark", isDarkBackground(this.effectiveBackground));
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
    document.documentElement.classList.toggle("reduce-motion", this.reducedMotion);
  }
}

export const appearance = new Appearance();
