export enum ThemeMode {
  Light = "light",
  Dark = "dark",
  System = "system",
}

export enum Theme {
  Default = "default",
  Tangerine = "tangerine",
  Notebook = "notebook",
  Whatsapp = "whatsapp",
  Neobrutalism = "neobrutalism",
}

class Appearance {
  mode = $state<ThemeMode>(ThemeMode.Dark);
  theme = $state<Theme>(Theme.Default);
  reducedMotion = $state(false);

  private media: MediaQueryList | null = null;

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
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
    localStorage.setItem("appearance:reducedMotion", value ? "1" : "0");
    this.applyMotion();
  }

  setTheme(theme: Theme) {
    this.theme = theme;
    localStorage.setItem("appearance:theme", theme);
    this.applyTheme();
  }

  private prefersDark() {
    return this.mode === "dark" || (this.mode === "system" && this.media?.matches);
  }

  private applyTheme() {
    const html = document.documentElement;

    html.classList.toggle("dark", this.prefersDark());
    html.dataset.theme = this.theme;
  }

  private applyMotion() {
    document.documentElement.classList.toggle("reduce-motion", this.reducedMotion);
  }
}

export const appearance = new Appearance();
