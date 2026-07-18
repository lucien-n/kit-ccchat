import { api, type Member, type ModeratedMember } from "$lib/api";
import { session } from "./session.svelte";

/** Admins see moderation state (ban/mute, role ids); everyone else sees the plain
 *  roster. Widening to one shape keeps a single member type across the app: the
 *  moderation fields a non-admin can't see are simply absent, never rendered. */
function widen(m: Member): ModeratedMember {
  return { ...m, banned: 0, mutedUntil: null, roleIds: [] };
}

/** The whole community, loaded once and kept current by app-level events. Every
 *  members surface reads from here instead of fetching its own copy. */
class Members {
  list = $state<ModeratedMember[]>([]);
  #loaded = false;

  async load(force = false) {
    if (!session.token) return;
    if (this.#loaded && !force) return;
    try {
      this.list = session.isAdmin
        ? (await api.members(session.token)).members
        : (await api.roster(session.token)).members.map(widen);
      this.#loaded = true;
    } catch {
      /* empty */
    }
  }

  byId(id: string): ModeratedMember | undefined {
    return this.list.find((m) => m.id === id);
  }

  /** Replace a member's full set of roles, then refresh so colors and rank stay
   *  in step everywhere they're shown. */
  async setRoles(userId: string, roleIds: string[]) {
    if (!session.token) return;
    await api.setUserRoles(session.token, userId, roleIds);
    await this.load(true);
  }

  clear() {
    this.list = [];
    this.#loaded = false;
  }
}

export const members = new Members();
