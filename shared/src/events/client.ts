import z from "zod";
import { MAX_IMAGES_PER_MESSAGE, MESSAGE_MAX_LENGTH } from "../primitives";

export enum ClientEventType {
  Message_Create = "message_create",
  Typing_Start = "typing_start",
  Voice_Join = "voice_join",
  Voice_Leave = "voice_leave",
  Screen_Share_Set = "screen_share_set",
}

export const clientEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(ClientEventType.Message_Create),
    channelId: z.string().min(1),
    content: z.string().trim().max(MESSAGE_MAX_LENGTH),
    imageIds: z.array(z.uuid()).max(MAX_IMAGES_PER_MESSAGE).optional(),
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
  z.object({
    type: z.literal(ClientEventType.Screen_Share_Set),
    sharing: z.boolean(),
  }),
]);
export type ClientEvent = z.infer<typeof clientEvent>;
