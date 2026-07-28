import { api, authToken } from "$lib/api";
import { legibleColor, luminanceOf } from "$lib/color";
import { Theme, ThemeMode, type AppearanceView } from "@ccchat/shared";

// Re-exported so components can keep importing the enums from the store.
export { Theme, ThemeMode };

class Appearance {
  mode = $state<ThemeMode>(ThemeMode.Dark);
  theme = $state<Theme>(Theme.Default);
  reducedMotion = $state(false);

  bgLuminance = $state(0.1);

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

  hydrate(prefs: AppearanceView) {
    this.mode = prefs.mode;
    this.theme = prefs.theme;
    this.reducedMotion = prefs.reducedMotion;
    localStorage.setItem("appearance:mode", prefs.mode);
    localStorage.setItem("appearance:theme", prefs.theme);
    localStorage.setItem("appearance:reducedMotion", prefs.reducedMotion ? "1" : "0");
    this.applyTheme();
    this.applyMotion();
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
      })
      .catch(() => {});
  }

  private prefersDark() {
    return this.mode === "dark" || (this.mode === "system" && this.media?.matches);
  }

  private applyTheme() {
    const html = document.documentElement;

    html.classList.toggle("dark", this.prefersDark());
    html.dataset.theme = this.theme;

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
