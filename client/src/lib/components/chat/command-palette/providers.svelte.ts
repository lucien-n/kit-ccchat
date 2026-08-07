import { soundUrl } from "$lib/api";
import { selectChannel } from "$lib/app";
import { channelTypeSpecs } from "$lib/specs";
import { attachmentSearch, channels, search, soundboard, voice } from "$lib/stores";
import HomeIcon from "@lucide/svelte/icons/home";
import ImageIcon from "@lucide/svelte/icons/image";
import MessageSquareIcon from "@lucide/svelte/icons/message-square";
import PaperclipIcon from "@lucide/svelte/icons/paperclip";
import Volume2Icon from "@lucide/svelte/icons/volume-2";
import { ChannelType, MATCH_CLOSE, MATCH_OPEN, type Channel } from "@motus/shared";
import type { PaletteContext, PaletteProvider } from "./types";

const stripMarkers = (s: string) =>
  s.replaceAll(MATCH_OPEN, "").replaceAll(MATCH_CLOSE, "");

const channelProvider: PaletteProvider = {
  group: "Channels",
  results(query, { close }) {
    const q = query.trim().toLowerCase();
    return channels.list
      .filter((c) => c.name.toLowerCase().includes(q))
      .map((channel) => ({
        id: `channel:${channel.id}`,
        label: channel.name,
        icon: channel.isMain ? HomeIcon : channelTypeSpecs[channel.type].icon,
        onSelect: () => joinChannel(channel, close),
      }));
  },
};

let soundsRequested = false;
const soundProvider: PaletteProvider = {
  group: "Sounds",
  open() {
    if (soundsRequested) return;
    soundsRequested = true;
    void soundboard.load();
  },
  results(query, { close }) {
    return soundboard.search(query).map((sound) => ({
      id: `sound:${sound.id}`,
      label: sound.name,
      icon: Volume2Icon,
      onSelect: () => {
        void voice.playSound(soundUrl(sound.id));
        close();
      },
    }));
  },
};

const messageProvider: PaletteProvider = {
  group: "Messages",
  get loading() {
    return search.loading;
  },
  sync(query) {
    search.schedule({ q: query });
  },
  close() {
    search.reset();
  },
  results(_query, { close, jumpToMessage }) {
    return search.hits.map(({ message, snippet }) => ({
      id: `message:${message.id}`,
      label: message.author?.displayName ?? "Unknown",
      subtitle: stripMarkers(snippet),
      icon: MessageSquareIcon,
      onSelect: () => {
        jumpToMessage(message.channelId, message.id);
        close();
      },
    }));
  },
};

const attachmentProvider: PaletteProvider = {
  group: "Attachments",
  get loading() {
    return attachmentSearch.loading;
  },
  sync(query) {
    attachmentSearch.schedule(query);
  },
  close() {
    attachmentSearch.reset();
  },
  results(_query, { close, jumpToMessage }) {
    return attachmentSearch.hits.map(({ attachment, channelId, messageId }) => ({
      id: `attachment:${attachment.id}`,
      label: attachment.filename,
      subtitle: channels.byId(channelId)?.name,
      icon: attachment.image ? ImageIcon : PaperclipIcon,
      onSelect: () => {
        jumpToMessage(channelId, messageId);
        close();
      },
    }));
  },
};

function joinChannel(channel: Channel, close: PaletteContext["close"]) {
  if (channel.type === ChannelType.Voice) void voice.join(channel);
  void selectChannel(channel.id);
  close();
}

export const providers: PaletteProvider[] = [
  channelProvider,
  soundProvider,
  messageProvider,
  attachmentProvider,
];
