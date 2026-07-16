import { zValidator } from '@hono/zod-validator';
import type { ValidationTargets } from 'hono';
import type { ZodType } from 'zod';

/** zValidator, but failing with our error shape.
 *
 *  Every client catch block reads `{ error }` off a 400. zValidator's default
 *  hook returns a zod issue dump instead, which would render as "[object
 *  Object]" in the UI — so the first issue's message is surfaced and the rest
 *  of the API contract stays exactly as it was.
 */
export function validate<T extends ZodType, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const first = result.error.issues[0];
      return c.json({ error: first?.message ?? 'invalid request' }, 400);
    }
  });
}
