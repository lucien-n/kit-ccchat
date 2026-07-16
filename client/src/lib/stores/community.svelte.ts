import { api } from "../api";

/** The instance itself, as opposed to your session on it. Readable logged out:
 *  the login screen shows the name. */
class Community {
  name = $state("ccchat");
  /** True on a brand-new instance with no accounts: show the setup wizard
   *  instead of a login form, so the first visitor claims it as owner. */
  needsSetup = $state(false);

  async load() {
    try {
      const info = await api.info();
      this.name = info.name;
      this.needsSetup = info.needsSetup;
    } catch {
      /* server may be unreachable; the login screen will surface it */
    }
  }
}

export const community = new Community();
