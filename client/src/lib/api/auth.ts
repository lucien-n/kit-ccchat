import type { LoginBody, RegisterBody, SetupBody } from "@ccchat/shared";
import { asToken, client, publicClient } from "./http";

export const auth = {
  /** Claim a brand-new instance. Only works while it has no accounts. */
  setup: async (body: SetupBody) =>
    (await publicClient.api.setup.$post({ json: body })).json(),

  register: async (body: RegisterBody) =>
    (await publicClient.api.auth.register.$post({ json: body })).json(),

  login: async (body: LoginBody) =>
    (await publicClient.api.auth.login.$post({ json: body })).json(),

  /** `token` is passed only while restoring a saved one, before the session
   *  adopts it. */
  me: async (token?: string) =>
    (await client.api.auth.me.$get(undefined, asToken(token))).json(),

  /** `token` is passed because the session is cleared first: a failing logout
   *  must not leave you stuck in a session you asked to leave. */
  logout: async (token?: string) =>
    (await client.api.auth.logout.$post(undefined, asToken(token))).json(),
};
