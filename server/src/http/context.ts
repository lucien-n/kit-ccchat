import type { Context } from "hono";
import type { Env } from "../auth.js";

/** `P` is the route path (e.g. `"/:id"`), which is what makes `c.req.param("id")`
 *  come back as a string rather than `string | undefined` in a controller that
 *  lives away from its router. */
export type AppContext<P extends string = string, E extends Env = Env> = Context<E, P>;

/** A context whose JSON body has already passed `validate("json", schema)`, so a
 *  controller in its own file still gets `c.req.valid("json")` typed as T. */
export type JsonContext<T, P extends string = string, E extends Env = Env> = Context<
  E,
  P,
  { in: { json: T }; out: { json: T } }
>;
