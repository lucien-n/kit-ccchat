import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodType } from "zod";
import { httpError } from "./http/errors.js";

/** Clients read `{ error }` off a 400; zValidator's default hook returns a zod
 *  issue dump. Thrown rather than returned so it stays out of the route type. */
export function validate<T extends ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      const first = result.error.issues[0];
      httpError(400, first?.message ?? "invalid request");
    }
  });
}
