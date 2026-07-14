export type ThemeMode = 'light' | 'dark' | 'system';

/** Client-only appearance preferences, persisted to localStorage and applied as
 *  classes on <html> (`dark`, `reduce-motion`). An inline script in app.html
 *  applies these before first paint to avoid a flash; this keeps them in sync. */
class Appearance {
  mode = $state<ThemeMode>('dark');
  reducedMotion = $state(false);

  private media: MediaQueryList | null = null;

  init() {
    this.media = window.matchMedia('(prefers-color-scheme: dark)');
    this.mode = (localStorage.getItem('appearance:mode') as ThemeMode) || 'dark';
    this.reducedMotion = localStorage.getItem('appearance:reducedMotion') === '1';
    this.applyTheme();
    this.applyMotion();

    // Follow the OS when in "system" mode.
    this.media.addEventListener('change', () => {
      if (this.mode === 'system') this.applyTheme();
    });
  }

  setMode(mode: ThemeMode) {
    this.mode = mode;
    localStorage.setItem('appearance:mode', mode);
    this.applyTheme();
  }

  setReducedMotion(value: boolean) {
    this.reducedMotion = value;
    localStorage.setItem('appearance:reducedMotion', value ? '1' : '0');
    this.applyMotion();
  }

  private prefersDark(): boolean {
    return this.mode === 'dark' || (this.mode === 'system' && !!this.media?.matches);
  }

  private applyTheme() {
    document.documentElement.classList.toggle('dark', this.prefersDark());
  }

  private applyMotion() {
    document.documentElement.classList.toggle('reduce-motion', this.reducedMotion);
  }
}

export const appearance = new Appearance();
