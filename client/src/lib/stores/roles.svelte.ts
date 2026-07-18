import { api, type Role } from "$lib/api";
import { session } from "./session.svelte";

/** The community's role list, cached for the management UI and the user card.
 *  `version` bumps whenever roles or their assignments change, so views that
 *  care (rosters) can re-derive off it. */
class Roles {
  list = $state<Role[]>([]);
  version = $state(0);
  #loaded = false;

  async load(force = false) {
    if (!session.token) return;
    if (this.#loaded && !force) return;
    try {
      this.list = (await api.roles(session.token)).roles;
      this.#loaded = true;
    } catch {
      /* a failed load leaves the last-known list; callers surface their own errors */
    }
  }

  byId(id: string): Role | undefined {
    return this.list.find((r) => r.id === id);
  }

  /** Something changed server-side (WS roles_changed): refetch and signal. */
  async invalidate() {
    this.version++;
    await this.load(true);
  }
}

export const roles = new Roles();
