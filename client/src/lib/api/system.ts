import { client } from "./http";

export const system = {
  /** Host machine snapshot (owner only). */
  stats: async () => (await client.api.system.$get()).json(),
};
