import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Services throw this instead of building a response, so they stay free of
 *  request/response plumbing. */
export function httpError(status: ContentfulStatusCode, message: string): never {
  throw new HTTPException(status, { message });
}

/** Clients read `{ error }` off every failure, so an HTTPException has to be
 *  rendered as JSON rather than hono's default plain text. */
export const onError: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: "internal error" }, 500);
};
