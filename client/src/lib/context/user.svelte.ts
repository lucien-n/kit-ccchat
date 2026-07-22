import { api, ModAction, type Member, type ModeratedMember, type Role } from "$lib/api";
import { apiErrorMessage } from "$lib/forms";
import { canModerate, isMuted } from "$lib/members";
import { members } from "$lib/stores/members.svelte";
import { roles } from "$lib/stores/roles.svelte";
import { session } from "$lib/stores/session.svelte";
import { getContext, setContext } from "svelte";
import { toast } from "svelte-sonner";
import { SvelteSet } from "svelte/reactivity";

const KEY = Symbol("user");

const PAST_TENSE: Record<ModAction, string> = {
  [ModAction.Kick]: "kicked",
  [ModAction.Ban]: "banned",
  [ModAction.Unban]: "unbanned",
  [ModAction.Mute]: "muted",
  [ModAction.Unmute]: "unmuted",
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
    return this.member?.displayName ?? "this member";
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
    return this.profile?.isOwner ? "owner" : this.profile?.isAdmin ? "admin" : "member";
  }

  async loadProfile() {
    try {
      const res = await api.users.profile(this.userId);
      this.profile = res.user;
      this.assigned = res.roles;
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to load profile"));
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
      toast.error(apiErrorMessage(e, "failed to update roles"));
    } finally {
      this.busyRoleId = null;
    }
  }

  async moderate(action: ModAction, minutes?: number) {
    const { name } = this;
    this.busy = true;
    try {
      await members.moderate(this.userId, action, minutes);
      toast.success(`${name} was ${PAST_TENSE[action]}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, "action failed"));
    } finally {
      this.busy = false;
      this.confirming = null;
    }
  }

  async copyId() {
    await navigator.clipboard.writeText(this.userId);
    toast.success("user id copied");
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
