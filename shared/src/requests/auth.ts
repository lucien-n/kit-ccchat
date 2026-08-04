import { z } from "zod";
import {
  communityName,
  inviteCode,
  optionalDisplayName,
  password,
  username,
} from "../primitives.js";

export const registerBody = z.object({
  inviteCode,
  username,
  displayName: optionalDisplayName,
  password,
});
export type RegisterBody = z.infer<typeof registerBody>;

export const loginBody = z.object({
  username: z.string().trim().toLowerCase(),
  password: z.string(),
});
export type LoginBody = z.infer<typeof loginBody>;

export const setupBody = z.object({
  communityName,
  username,
  displayName: optionalDisplayName,
  password,
});
export type SetupBody = z.infer<typeof setupBody>;

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1, "current password required"),
  newPassword: password,
});
export type ChangePasswordBody = z.infer<typeof changePasswordBody>;
