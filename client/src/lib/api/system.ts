import { client } from "./http";

export const system = {
  /** Host machine snapshot, including backup status (owner only). */
  stats: async () => (await client.api.system.$get()).json(),
  /** Take a database snapshot now. */
  backup: async () => (await client.api.system.backups.$post()).json(),
  deleteBackup: async (name: string) =>
    (await client.api.system.backups[":name"].$delete({ param: { name } })).json(),
  /** Fetch a backup file's bytes (auth flows through the signed client). */
  downloadBackup: async (name: string) =>
    (await client.api.system.backups[":name"].download.$get({ param: { name } })).blob(),
};
