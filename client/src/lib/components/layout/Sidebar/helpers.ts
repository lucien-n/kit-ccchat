import { ChannelType } from "@ccchat/shared";
import HashIcon from "@lucide/svelte/icons/hash";
import Volume2Icon from "@lucide/svelte/icons/volume-2";
import type { Component } from "svelte";

export const CHANNEL_TYPE_ICON: Record<ChannelType, Component> = {
  [ChannelType.Text]: HashIcon,
  [ChannelType.Voice]: Volume2Icon,
};
