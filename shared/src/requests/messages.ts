import { z } from "zod";
import { reactionEmoji } from "../emoji.js";
import { MESSAGE_MAX_LENGTH } from "../primitives.js";

export const editMessageBody = z.object({
  content: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
});
export type EditMessageBody = z.infer<typeof editMessageBody>;

export const reactMessageParam = z.object({
  id: z.uuid(),
  emoji: reactionEmoji,
});
