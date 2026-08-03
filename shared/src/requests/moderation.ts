import { z } from "zod";
import { deleteSpan, DeleteSpan } from "../primitives.js";

export const muteBody = z.object({
  minutes: z.number().int().positive().max(10080).default(60),
});

export const banBody = z.object({
  deleteSpan: deleteSpan.default(DeleteSpan.None),
});
export type BanBody = z.infer<typeof banBody>;
