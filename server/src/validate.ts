import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodType } from "zod";

/** Clients read `{ error }` off a 400; zValidator's default hook returns a zod
 *  issue dump. */
export function validate<T extends ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const first = result.error.issues[0];
      return c.json({ error: first?.message ?? "invalid request" }, 400);
    }
  });
}
