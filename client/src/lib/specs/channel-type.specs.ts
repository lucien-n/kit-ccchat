import { ChannelType } from "@motus/shared";
import type { LucideIconType, SpecsRecord } from "./types";
import HashIcon from "@lucide/svelte/icons/hash";
import Volume2Icon from "@lucide/svelte/icons/volume-2";

export const channelTypeSpecs: SpecsRecord<ChannelType, LucideIconType> = {
  [ChannelType.Text]: {
    value: ChannelType.Text,
    label: "Text",
    icon: HashIcon,
  },
  [ChannelType.Voice]: {
    value: ChannelType.Voice,
    label: "Voice",
    icon: Volume2Icon,
  },
};
