import { z } from "zod";

export enum ChannelType {
  Text = "text",
  Voice = "voice",
}
export const channelType = z.enum(ChannelType);

export const channelName = z
  .string()
  .trim()
  .regex(/^[\w\- ]{1,32}$/, "invalid channel name");

export const channelNameKey = (name: string) => name.trim().toLowerCase();

export const channelId = z.string().min(1);
