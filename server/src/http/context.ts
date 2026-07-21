import type { Context } from "hono";
import type { ZodType, input, output } from "zod";
import type { Env } from "../auth.js";

/** `P` is the route path (e.g. `"/:id"`), which is what makes `c.req.param("id")`
 *  come back as a string rather than `string | undefined` in a controller that
 *  lives away from its router. */
export type AppContext<P extends string = string, E extends Env = Env> = Context<E, P>;

/** A context whose body has already passed `validate("json", schema)`, so a
 *  controller in its own file still gets `c.req.valid("json")` typed. Takes the
 *  schema, not the body type: a field with a default is optional going in and
 *  present coming out, and the rpc client asks callers for the input side. */
export type JsonContext<
  S extends ZodType,
  P extends string = string,
  E extends Env = Env,
> = Context<E, P, { in: { json: input<S> }; out: { json: output<S> } }>;

export type QueryContext<
  S extends ZodType,
  P extends string = string,
  E extends Env = Env,
> = Context<E, P, { in: { query: input<S> }; out: { query: output<S> } }>;
