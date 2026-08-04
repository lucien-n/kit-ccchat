import { z } from "zod";
import { channelId, channelName, channelType, ChannelType } from "../primitives.js";

export const createChannelBody = z.object({
  name: channelName,
  type: channelType.default(ChannelType.Text),
});
export type CreateChannelBody = z.infer<typeof createChannelBody>;

export const renameChannelBody = z.object({ name: channelName });
export type RenameChannelBody = z.infer<typeof renameChannelBody>;

// Channels top-to-bottom as shown in the sidebar. The server reassigns every
// position from this, so the order is the whole truth and positions never
// collide. Text and voice can be sent together; grouping is a display concern.
export const reorderChannelsBody = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
export type ReorderChannelsBody = z.infer<typeof reorderChannelsBody>;

export const voiceTokenBody = z.object({ channelId });
