/** The contract between server and client.
 *
 *  Every shape below was previously written twice - once in server/src/views.ts
 *  and once in client/src/lib/api.ts - with nothing checking that the two
 *  agreed. Add a field on one side and the other still compiled, then failed at
 *  runtime. These are the single definition both sides derive from.
 */
export * from "./primitives.js";
export * from "./requests.js";
export * from "./views.js";
