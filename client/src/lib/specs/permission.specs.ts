import { m } from "$lib/paraglide/messages";
import { Permission } from "@motus/shared";
import type { SpecsRecord } from "./types";

// `label` is a getter so it re-reads the active locale wherever it is rendered.
export const permissionSpecs: SpecsRecord<Permission> = {
  [Permission.Admin]: {
    get label() {
      return m.permission_admin_label();
    },
    value: Permission.Admin,
  },
  [Permission.Member]: {
    get label() {
      return m.permission_member_label();
    },
    value: Permission.Member,
  },
};
