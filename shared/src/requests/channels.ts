import { z } from "zod";
import { channelId, channelName, channelType, ChannelType } from "../primitives.js";

export const createChannelBody = z.object({
  name: channelName,
  type: channelType.default(ChannelType.Text),
});
export type CreateChannelBody = z.infer<typeof createChannelBody>;

export const renameChannelBody = z.object({ name: channelName });
export type RenameChannelBody = z.infer<typeof renameChannelBody>;

export const voiceTokenBody = z.object({ channelId });
