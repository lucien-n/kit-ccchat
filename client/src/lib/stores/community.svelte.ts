import { api, communityIconUrl } from "../api";

/** The instance itself, as opposed to your session on it. Readable logged out:
 *  the login screen shows the name. */
class Community {
  name = $state("ccchat");
  /** True on a brand-new instance with no accounts: show the setup wizard
   *  instead of a login form, so the first visitor claims it as owner. */
  needsSetup = $state(false);
  /** Bumped on every icon upload, so the URL cache-busts. null = no icon. */
  iconVersion = $state<number | null>(null);

  get iconUrl(): string | null {
    return communityIconUrl(this.iconVersion);
  }

  async load() {
    try {
      const info = await api.info();
      this.name = info.name;
      this.needsSetup = info.needsSetup;
      this.iconVersion = info.iconVersion;
    } catch {
      /* server may be unreachable; the login screen will surface it */
    }
  }
}

export const community = new Community();
