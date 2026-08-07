import {
  baseLocale,
  getLocale,
  locales,
  overwriteGetLocale,
  setLocale as paraglideSetLocale,
  type Locale,
} from "$lib/paraglide/runtime";

export { locales, type Locale };

class LocaleStore {
  current = $state<Locale>(baseLocale);

  init() {
    this.current = getLocale();
    overwriteGetLocale(() => this.current);
    document.documentElement.lang = this.current;
  }

  set(locale: Locale) {
    void paraglideSetLocale(locale, { reload: false });
    this.current = locale;
    document.documentElement.lang = locale;
  }
}

export const locale = new LocaleStore();
