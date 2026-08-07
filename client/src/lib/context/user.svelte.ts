import {
  api,
  ModAction,
  type Member,
  type ModeratedMember,
  type ModOptions,
  type Role,
} from "$lib/api";
import { m } from "$lib/paraglide/messages";
import { apiErrorMessage } from "$lib/forms";
import { canModerate, isMuted } from "$lib/members";
import { members, roles, session } from "$lib/stores";
import { getContext, setContext } from "svelte";
import { toast } from "svelte-sonner";
import { SvelteSet } from "svelte/reactivity";

const KEY = Symbol("user");

// Each action gets its own message (rather than concatenating a verb) so the
// full sentence can be phrased naturally per locale.
const RESULT_MESSAGE: Record<ModAction, (args: { name: string }) => string> = {
  [ModAction.Kick]: m.moderation_result_kicked,
  [ModAction.Ban]: m.moderation_result_banned,
  [ModAction.Unban]: m.moderation_result_unbanned,
  [ModAction.Mute]: m.moderation_result_muted,
  [ModAction.Unmute]: m.moderation_result_unmuted,
};

export class UserContext {
  #read: () => string;

  profile = $state<Member | null>(null);
  assigned = $state<Role[]>([]);
  busyRoleId = $state<string | null>(null);
  confirming = $state<ModAction.Kick | ModAction.Ban | null>(null);
  busy = $state(false);

  constructor(read: () => string) {
    this.#read = read;
  }

  get userId(): string {
    return this.#read();
  }

  get member(): ModeratedMember | undefined {
    return members.byId(this.userId);
  }

  get name(): string {
    return this.member?.displayName ?? m.user_this_member();
  }

  get showModeration(): boolean {
    return canModerate(session.user, this.member);
  }

  get muted(): boolean {
    return !!this.member && isMuted(this.member);
  }

  get assignedIds(): Set<string> {
    return new SvelteSet(this.assigned.map((r) => r.id));
  }

  get canManageRoles(): boolean {
    return (
      session.isAdmin && (session.isOwner || !this.profile?.isOwner) && !!this.profile
    );
  }

  get permissionLabel(): string {
    return this.profile?.isOwner
      ? m.permission_owner()
      : this.profile?.isAdmin
        ? m.permission_admin()
        : m.permission_member();
  }

  async loadProfile() {
    try {
      const res = await api.users.profile(this.userId);
      this.profile = res.user;
      this.assigned = res.roles;
    } catch (e) {
      toast.error(apiErrorMessage(e, m.user_load_profile_failed()));
    }
  }

  async toggleRole(roleId: string) {
    if (!this.profile) return;
    const ids = this.assignedIds;
    const next = ids.has(roleId)
      ? [...ids].filter((id) => id !== roleId)
      : [...ids, roleId];
    this.busyRoleId = roleId;
    try {
      await members.setRoles(this.profile.id, next);
      await this.loadProfile();
    } catch (e) {
      toast.error(apiErrorMessage(e, m.user_update_roles_failed()));
    } finally {
      this.busyRoleId = null;
    }
  }

  async moderate(action: ModAction, opts?: ModOptions) {
    const { name } = this;
    this.busy = true;
    try {
      await members.moderate(this.userId, action, opts);
      toast.success(RESULT_MESSAGE[action]({ name }));
    } catch (e) {
      toast.error(apiErrorMessage(e, m.moderation_action_failed()));
    } finally {
      this.busy = false;
      this.confirming = null;
    }
  }

  async copyId() {
    await navigator.clipboard.writeText(this.userId);
    toast.success(m.user_id_copied());
  }

  loadRoles() {
    if (session.isAdmin) roles.load();
  }
}

export function setUserContext(read: () => string): UserContext {
  return setContext(KEY, new UserContext(read));
}

export function getUserContext(): UserContext {
  return getContext<UserContext>(KEY);
}
