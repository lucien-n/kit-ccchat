import { z } from "zod";
import { USERNAME_MIN_LEN, USERNAME_MAX_LEN } from "../mentions.js";

export const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    new RegExp(`^[a-z0-9_.-]{${USERNAME_MIN_LEN},${USERNAME_MAX_LEN}}$`),
    `username must be ${USERNAME_MIN_LEN}-${USERNAME_MAX_LEN} chars: a-z 0-9 _ . -`,
  );

export const password = z.string().min(8, "password must be at least 8 characters");

export const displayName = z.string().trim().min(1).max(32);

export const optionalDisplayName = z.union([z.literal(""), displayName]).optional();

export const communityName = z.string().trim().min(1).max(60);
