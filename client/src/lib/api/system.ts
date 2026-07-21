import type { SystemStats } from "@ccchat/shared";
import { request } from "./http";

export const system = {
  /** Host machine snapshot (owner only). */
  stats: () => request<{ stats: SystemStats }>("/api/system"),
};
