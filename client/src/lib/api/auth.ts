import type { LoginBody, Member, RegisterBody, SetupBody } from "@ccchat/shared";
import { publicRequest, request } from "./http";

export const auth = {
  /** Claim a brand-new instance. Only works while it has no accounts. */
  setup: (body: SetupBody) =>
    publicRequest<{
      token: string;
      user: Member;
      inviteCode: string;
      communityName: string;
    }>("/api/setup", { method: "POST", body }),

  register: (body: RegisterBody) =>
    publicRequest<{ token: string; user: Member }>("/api/auth/register", {
      method: "POST",
      body,
    }),

  login: (body: LoginBody) =>
    publicRequest<{ token: string; user: Member }>("/api/auth/login", {
      method: "POST",
      body,
    }),

  /** `token` is passed only while restoring a saved one, before the session
   *  adopts it. */
  me: (token?: string) => request<{ user: Member }>("/api/auth/me", { token }),

  /** `token` is passed because the session is cleared first: a failing logout
   *  must not leave you stuck in a session you asked to leave. */
  logout: (token?: string) =>
    request<{ ok: true }>("/api/auth/logout", { method: "POST", token }),
};
