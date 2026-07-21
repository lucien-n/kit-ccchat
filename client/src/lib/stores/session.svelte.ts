import { type RegisterBody } from "@ccchat/shared";
import { api, authToken, type Member } from "../api";

/** Who you are and what proves it. Everything else keys off `token`. */
class Session {
  user = $state<Member | null>(null);

  /** Stored in the api layer so a request can sign itself; mirrored here because
   *  this is where the rest of the app looks for it. */
  get token(): string | null {
    return authToken.value;
  }

  get isAdmin(): boolean {
    return this.user?.isAdmin ?? false;
  }

  get isOwner(): boolean {
    return this.user?.isOwner ?? false;
  }

  async refresh() {
    if (!this.token) return;
    try {
      const { user } = await api.auth.me();
      this.user = user;
    } catch {
      /* empty */
    }
  }

  async login(username: string, password: string) {
    const { token, user } = await api.auth.login({ username, password });
    this.start(token, user);
  }

  async register(body: RegisterBody) {
    const { token, user } = await api.auth.register(body);
    this.start(token, user);
  }

  /** A stored token may have been revoked or the account banned since, so it is
   *  verified before being adopted rather than trusted off localStorage. */
  async restore(): Promise<boolean> {
    const saved = localStorage.getItem("token");
    if (!saved) return false;
    try {
      const { user } = await api.auth.me(saved);
      this.start(saved, user);
      return true;
    } catch {
      localStorage.removeItem("token");
      return false;
    }
  }

  start(token: string, user: Member) {
    authToken.value = token;
    this.user = user;
    localStorage.setItem("token", token);
  }

  patchUser(patch: Partial<Member>) {
    if (this.user) this.user = { ...this.user, ...patch };
  }

  /** Drops the local session first: a failing logout call must not leave you
   *  stuck in a session you asked to leave. */
  async end() {
    const token = this.token;
    authToken.value = null;
    this.user = null;
    localStorage.removeItem("token");
    if (token) await api.auth.logout(token).catch(() => {});
  }
}

export const session = new Session();
