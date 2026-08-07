import { m } from "$lib/paraglide/messages";
import { ChannelType } from "@motus/shared";
import type { LucideIconType, SpecsRecord } from "./types";
import HashIcon from "@lucide/svelte/icons/hash";
import Volume2Icon from "@lucide/svelte/icons/volume-2";

// `label` is a getter so it re-reads the active locale wherever it is rendered.
export const channelTypeSpecs: SpecsRecord<ChannelType, LucideIconType> = {
  [ChannelType.Text]: {
    value: ChannelType.Text,
    get label() {
      return m.channel_category_text();
    },
    icon: HashIcon,
  },
  [ChannelType.Voice]: {
    value: ChannelType.Voice,
    get label() {
      return m.channel_category_voice();
    },
    icon: Volume2Icon,
  },
};
