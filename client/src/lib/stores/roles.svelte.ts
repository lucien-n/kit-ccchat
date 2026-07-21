import { api, type Role } from "$lib/api";

class Roles {
  list = $state<Role[]>([]);
  #loaded = false;

  async load(force = false) {
    if (this.#loaded && !force) return;
    try {
      this.list = (await api.roles.list()).roles;
      this.#loaded = true;
    } catch {
      /* empty */
    }
  }

  byId(id: string): Role | undefined {
    return this.list.find((r) => r.id === id);
  }

  clear() {
    this.list = [];
    this.#loaded = false;
  }
}

export const roles = new Roles();
