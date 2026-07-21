import type { AppType } from "ccchat-server";
import { hc } from "hono/client";
import { authToken } from "./token.svelte";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Empty in the browser (same-origin, dev-proxied), but the mobile app can point
 *  at a remote server by setting it. */
export function apiBase(): string {
  if (typeof localStorage !== "undefined") return localStorage.getItem("serverUrl") ?? "";
  return "";
}

async function orThrow(res: Response): Promise<Response> {
  if (res.ok) return res;
  const data = await res.json().catch(() => null);
  throw new ApiError(res.status, data?.error ?? `request failed (${res.status})`);
}

/** Rejects before reaching the network when nothing signed the request, so a
 *  signed-out caller fails the same way the server would have failed it. */
const signedFetch: typeof fetch = async (input, init) => {
  if (!new Headers(init?.headers).has("Authorization"))
    throw new ApiError(401, "not signed in");
  return orThrow(await fetch(input, init));
};

const publicFetch: typeof fetch = async (input, init) =>
  orThrow(await fetch(input, init));

const authorization = (): Record<string, string> => {
  const token = authToken.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const client = hc<AppType>(apiBase(), {
  fetch: signedFetch,
  headers: authorization,
});

/** The handful of endpoints that answer before sign-in. */
export const publicClient = hc<AppType>(apiBase(), { fetch: publicFetch });

/** Only for the two calls made outside a signed-in session. */
export const asToken = (token?: string) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
