import { type RegisterBody } from "@ccchat/shared";
import { api, type PublicUser } from "../api";

/** Who you are and what proves it. Everything else keys off `token`. */
class Session {
  token = $state<string | null>(null);
  user = $state<PublicUser | null>(null);

  get isAdmin(): boolean {
    return this.user?.isAdmin ?? false;
  }

  get isOwner(): boolean {
    return this.user?.isOwner ?? false;
  }

  async refresh() {
    if (!this.token) return;
    try {
      const { user } = await api.me(this.token);
      this.user = user;
    } catch {
      /* empty */
    }
  }

  async login(username: string, password: string) {
    const { token, user } = await api.login({ username, password });
    this.start(token, user);
  }

  async register(body: RegisterBody) {
    const { token, user } = await api.register(body);
    this.start(token, user);
  }

  /** A stored token may have been revoked or the account banned since, so it is
   *  verified before being adopted rather than trusted off localStorage. */
  async restore(): Promise<boolean> {
    const saved = localStorage.getItem("token");
    if (!saved) return false;
    try {
      const { user } = await api.me(saved);
      this.start(saved, user);
      return true;
    } catch {
      localStorage.removeItem("token");
      return false;
    }
  }

  start(token: string, user: PublicUser) {
    this.token = token;
    this.user = user;
    localStorage.setItem("token", token);
  }

  patchUser(patch: Partial<PublicUser>) {
    if (this.user) this.user = { ...this.user, ...patch };
  }

  /** Drops the local session first: a failing logout call must not leave you
   *  stuck in a session you asked to leave. */
  async end() {
    const token = this.token;
    this.token = null;
    this.user = null;
    localStorage.removeItem("token");
    if (token) await api.logout(token).catch(() => {});
  }
}

export const session = new Session();
