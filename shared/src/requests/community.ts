import { z } from "zod";
import { communityName, maxUses } from "../primitives.js";

export const renameCommunityBody = z.object({ communityName });

export const createInviteBody = z.object({
  // Single-use unless asked otherwise: the safe default for a link you paste
  // into a chat you don't control.
  maxUses: maxUses.default(1),
  // Hours from now. 0 or absent = never expires; negative is ignored rather
  // than minting a link that is dead on arrival.
  expiresInHours: z.number().optional(),
});
export type CreateInviteBody = z.infer<typeof createInviteBody>;
