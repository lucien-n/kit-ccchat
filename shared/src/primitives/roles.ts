import { z } from "zod";

export enum Permission {
  Admin = "admin",
  Member = "member",
}
export const permission = z.enum(Permission);

export const roleName = z.string().trim().min(1).max(32);

export const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "color must be a hex like #a1b2c3");
