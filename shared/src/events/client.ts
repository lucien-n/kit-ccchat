import z from "zod";
import { channelId, MAX_IMAGES_PER_MESSAGE, MESSAGE_MAX_LENGTH } from "../primitives";

export enum ClientEventType {
  Message_Create = "message_create",
  Typing_Start = "typing_start",
  Voice_Join = "voice_join",
  Voice_Leave = "voice_leave",
  Voice_Move = "voice_move",
  Screen_Share_Set = "screen_share_set",
  Mic_Set = "mic_set",
  Deafen_Set = "deafen_set",
}

export const clientEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(ClientEventType.Message_Create),
    channelId,
    content: z.string().trim().max(MESSAGE_MAX_LENGTH),
    imageIds: z.array(z.uuid()).max(MAX_IMAGES_PER_MESSAGE).optional(),
    replyToId: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal(ClientEventType.Typing_Start),
    channelId,
  }),
  z.object({
    type: z.literal(ClientEventType.Voice_Join),
    channelId,
  }),
  z.object({
    type: z.literal(ClientEventType.Voice_Leave),
  }),
  z.object({
    type: z.literal(ClientEventType.Voice_Move),
    userId: z.uuid(),
    channelId,
  }),
  z.object({
    type: z.literal(ClientEventType.Screen_Share_Set),
    sharing: z.boolean(),
  }),
  z.object({
    type: z.literal(ClientEventType.Mic_Set),
    muted: z.boolean(),
  }),
  z.object({
    type: z.literal(ClientEventType.Deafen_Set),
    deafened: z.boolean(),
  }),
]);
export type ClientEvent = z.infer<typeof clientEvent>;
