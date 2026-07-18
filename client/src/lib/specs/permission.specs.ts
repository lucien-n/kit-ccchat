import { Permission } from "@ccchat/shared";
import type { SpecsRecord } from "./types";

export const permissionSpecs: SpecsRecord<Permission> = {
  [Permission.Admin]: {
    label: "Admin",
    value: Permission.Admin,
  },
  [Permission.Member]: {
    label: "Member",
    value: Permission.Member,
  },
};
