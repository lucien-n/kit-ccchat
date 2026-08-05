import { channelNameKey, type ChannelType } from "@motus/shared";

type NamedChannel = { name: string; type: ChannelType };

/** Whether an existing channel of the same type already uses this name. Answered
 *  against the list the client already holds; the server checks again on submit.
 *  `currentName` exempts the channel being renamed from clashing with itself. */
export function channelNameTaken(
  name: string,
  type: ChannelType,
  list: NamedChannel[],
  currentName?: string,
): boolean {
  const key = channelNameKey(name);
  if (!key || (currentName != null && key === channelNameKey(currentName))) return false;
  return list.some((c) => c.type === type && channelNameKey(c.name) === key);
}
