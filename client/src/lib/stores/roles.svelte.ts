import { api, type Role } from "$lib/api";
import { session } from "./session.svelte";

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
      /* empty */
    }
  }

  byId(id: string): Role | undefined {
    return this.list.find((r) => r.id === id);
  }

  async invalidate() {
    this.version++;
    await this.load(true);
  }
}

export const roles = new Roles();
