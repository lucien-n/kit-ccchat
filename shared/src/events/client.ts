import z from "zod";
import { MESSAGE_MAX_LENGTH } from "../primitives";

export enum ClientEventType {
  Message_Create = "message_create",
  Typing_Start = "typing_start",
  Voice_Join = "voice_join",
  Voice_Leave = "voice_leave",
}

export const clientEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(ClientEventType.Message_Create),
    channelId: z.string().min(1),
    content: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH),
    replyToId: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal(ClientEventType.Typing_Start),
    channelId: z.string().min(1),
  }),
  z.object({
    type: z.literal(ClientEventType.Voice_Join),
    channelId: z.string().min(1),
  }),
  z.object({
    type: z.literal(ClientEventType.Voice_Leave),
  }),
]);
export type ClientEvent = z.infer<typeof clientEvent>;
