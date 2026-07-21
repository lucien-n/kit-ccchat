import { api, type Member, type ModAction, type ModeratedMember } from "$lib/api";
import { session } from "./session.svelte";

// Non-admins load the plain roster; the moderation fields they can't see get
// harmless defaults so the app has one member type.
function widen(m: Member): ModeratedMember {
  return { ...m, banned: 0, mutedUntil: null, roleIds: [] };
}

class Members {
  list = $state<ModeratedMember[]>([]);
  #loaded = false;

  async load(force = false) {
    if (this.#loaded && !force) return;
    try {
      this.list = session.isAdmin
        ? (await api.moderation.members()).members
        : (await api.users.list()).members.map(widen);
      this.#loaded = true;
    } catch {
      /* empty */
    }
  }

  byId(id: string): ModeratedMember | undefined {
    return this.list.find((m) => m.id === id);
  }

  async setRoles(userId: string, roleIds: string[]) {
    await api.roles.setForUser(userId, roleIds);
    await this.load(true);
  }

  async moderate(userId: string, action: ModAction, body?: unknown) {
    await api.moderation.act(userId, action, body);
    await this.load(true);
  }

  clear() {
    this.list = [];
    this.#loaded = false;
  }
}

export const members = new Members();
