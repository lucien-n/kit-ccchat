import { ChannelType } from "@ccchat/shared";
import { channels } from "../stores/channels.svelte";
import { members } from "../stores/members.svelte";
import { presence } from "../stores/presence.svelte";
import { session } from "../stores/session.svelte";
import { voice } from "../stores/voice.svelte";

export interface SeedOptions {
  longNames?: boolean;
  allSpeaking?: boolean;
  canPublish?: boolean;
}

const NAMES = [
  "Ada",
  "Bruno",
  "Chandrika",
  "Dan",
  "Eleonore",
  "Fatima",
  "Grzegorz",
  "Hal",
  "Ines",
  "Jae-won",
  "Kwame",
  "Lucía",
];

const LONG =
  "Bartholomew Featherstonehaugh-Vandermeer the Third, Keeper of the Longest Display Name";

function nameFor(i: number, longNames: boolean): string {
  if (longNames) return i % 2 === 0 ? LONG : NAMES[i % NAMES.length];
  return NAMES[i % NAMES.length];
}

/** Fills both voice sources at once: `voice.participants` drives VoiceBar, while
 *  `presence.voice[channelId]` drives the member list under the sidebar row.
 *  Real roster ids are used where they exist so the profile popover resolves. */
export async function seedVoice(count = 6, opts: SeedOptions = {}) {
  const channel = channels.list.find((c) => c.type === ChannelType.Voice);
  if (!channel) {
    console.warn("[dev] seedVoice: no voice channel exists to seed into");
    return;
  }

  await members.load();
  const me = session.user;
  const others = members.list.filter((m) => m.id !== me?.id);

  const people = Array.from({ length: count }, (_, i) => {
    const real = i === 0 ? me : others[i - 1];
    return {
      id: real?.id ?? `dev-voice-${i}`,
      name: opts.longNames ? nameFor(i, true) : (real?.displayName ?? nameFor(i, false)),
      avatarVersion: real?.avatarVersion ?? null,
      isLocal: i === 0,
      speaking: opts.allSpeaking ? true : i % 3 === 0,
      muted: i % 4 === 0,
    };
  });

  voice.channelId = channel.id;
  voice.channelName = channel.name;
  voice.status = "connected";
  voice.canPublish = opts.canPublish ?? true;
  voice.micMuted = false;
  voice.participants = people.map((p) => ({
    identity: p.id,
    name: p.name,
    speaking: p.speaking,
    muted: p.muted,
    isLocal: p.isLocal,
  }));
  presence.setVoice({
    ...presence.voice,
    [channel.id]: people.map((p) => ({
      id: p.id,
      displayName: p.name,
      avatarVersion: p.avatarVersion,
    })),
  });

  console.info(`[dev] seeded ${count} voice participants into #${channel.name}`);
}

export function clearSeededVoice() {
  void voice.leave();
  presence.setVoice({});
}

export function installVoiceDevTools() {
  const w = window as unknown as {
    seedVoice: typeof seedVoice;
    clearSeededVoice: typeof clearSeededVoice;
  };
  w.seedVoice = seedVoice;
  w.clearSeededVoice = clearSeededVoice;

  const q = new URLSearchParams(location.search);
  const n = Number(q.get("seedVoice"));
  if (Number.isFinite(n) && n > 0) {
    void seedVoice(n, {
      longNames: q.has("longNames"),
      allSpeaking: q.has("allSpeaking"),
      canPublish: !q.has("noPublish"),
    });
  }
}
