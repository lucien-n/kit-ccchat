import { Role } from "./primitives";

export const ROLE_RANK: Record<Role, number> = {
  [Role.Member]: 0,
  [Role.Admin]: 1,
  [Role.Owner]: 2,
};

export function rankOf(role: Role): number {
  return ROLE_RANK[role] ?? -1;
}
