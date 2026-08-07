import { z } from "zod";

export enum SystemEvent {
  Member_Join = "member_join",
}
export const systemEvent = z.enum(SystemEvent);

export const MESSAGE_MAX_LENGTH = 4000;

export const MAX_REACTIONS_PER_MESSAGE = 30;

export const MAX_PINS_PER_CHANNEL = 50;

export const REPLY_SNIPPET_MAX = 200;

// Cap on unfurled cards per message (matches Discord); bounds card spam and
// outbound fetches.
export const MAX_EMBEDS_PER_MESSAGE = 3;

export const TYPING_THROTTLE_MS = 1500;
export const TYPING_TIMEOUT_MS = 3000;
