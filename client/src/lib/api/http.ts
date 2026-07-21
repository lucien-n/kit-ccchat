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

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Overrides the session token. Only for calls made outside a signed-in
   *  session: verifying a saved token before adopting it, and logging out after
   *  it has been cleared. */
  token?: string;
}

function url(path: string, query: RequestOptions["query"]): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {}))
    if (value !== undefined) params.set(key, String(value));
  const qs = params.toString();
  return `${apiBase()}${path}${qs ? `?${qs}` : ""}`;
}

async function send<T>(
  path: string,
  token: string | null,
  opts: RequestOptions,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url(path, opts.query), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok)
    throw new ApiError(res.status, data?.error ?? `request failed (${res.status})`);
  return data as T;
}

/** Signs the request with the current session. Rejects before reaching the
 *  network when there is none, so a signed-out caller gets the same failure it
 *  would have got back from the server. */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = opts.token ?? authToken.value;
  if (!token) throw new ApiError(401, "not signed in");
  return send<T>(path, token, opts);
}

/** The handful of endpoints that answer before sign-in. */
export async function publicRequest<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  return send<T>(path, null, opts);
}
