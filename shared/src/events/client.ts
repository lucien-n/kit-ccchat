import z from "zod";
import { MESSAGE_MAX_LENGTH } from "../primitives";

export enum ClientEvenType {
  Message_Create = "Message_Create",
  Voice_Join = "Voice_Join",
  Voice_Leave = "Voice_Leave",
}

export const clientEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(ClientEvenType.Message_Create),
    channelId: z.string().min(1),
    content: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
    replyToId: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal(ClientEvenType.Voice_Join),
    channelId: z.string().min(1),
  }),
  z.object({
    type: z.literal(ClientEvenType.Voice_Leave),
  }),
]);
export type ClientEvent = z.infer<typeof clientEvent>;
