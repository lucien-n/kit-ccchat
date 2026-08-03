import { z } from "zod";

export const inviteCode = z.string().trim().min(1, "invite code required");

export const maxUses = z.number().int().min(0).max(1000);
