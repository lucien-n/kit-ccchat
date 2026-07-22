import {
  ChannelType,
  ServerEventType,
  type RegisterBody,
  type ServerEvent,
  type SetupBody,
} from "@ccchat/shared";
import { toast } from "svelte-sonner";
import { api, type MessageView } from "./api";
import { pingsMe } from "./mentions";
import { playPing, unlockAudio } from "./notify";
import { channels } from "./stores/channels.svelte";
import { community } from "./stores/community.svelte";
import { members } from "./stores/members.svelte";
import { messages } from "./stores/messages.svelte";
import { prefs } from "./stores/prefs.svelte";
import { presence } from "./stores/presence.svelte";
import { realtime } from "./stores/realtime.svelte";
import { roles } from "./stores/roles.svelte";
import { search } from "./stores/search.svelte";
import { session } from "./stores/session.svelte";
import { typing } from "./stores/typing.svelte";
import { unread } from "./stores/unread.svelte";

export async function init() {
  prefs.init();
  window.addEventListener("focus", () => {
    if (channels.currentId) void unread.markRead(channels.currentId);
  });
  // Satisfy the browser autoplay policy so the first ping can play.
  window.addEventListener("pointerdown", () => unlockAudio(), { once: true });

  await community.load();
  if (community.needsSetup) return;
  if (await session.restore()) await afterLogin();
}

export async function login(username: string, password: string) {
  await session.login(username, password);
  await afterLogin();
}

export async function register(body: RegisterBody) {
  await session.register(body);
  await afterLogin();
}

export async function setup(body: SetupBody): Promise<string> {
  const { token, user, inviteCode, communityName } = await api.auth.setup(body);
  community.name = communityName;
  session.start(token, user);
  await afterLogin();
  return inviteCode;
}

export async function selectChannel(id: string) {
  channels.currentId = id;
  void unread.markRead(id);
  const channel = channels.list.find((c) => c.id === id);
  if (!channel || channel.type !== ChannelType.Text) {
    messages.clear();
    return;
  }
  await messages.load(id);
}

export async function openMessage(channelId: string, messageId: string) {
  channels.currentId = channelId;
  void unread.markRead(channelId);
  if (!(await messages.loadAround(channelId, messageId))) await messages.load(channelId);
}

export async function jumpToPresent() {
  const id = channels.currentId;
  if (!id) return;
  await messages.jumpToPresent();
  void unread.markRead(id);
}

export async function logout() {
  realtime.stop();
  unread.clear();
  messages.clear();
  channels.clear();
  presence.clear();
  typing.clear();
  members.clear();
  roles.clear();
  search.close();
  await session.end();
}

async function afterLogin() {
  await channels.load();
  await unread.load();
  // Mention chips trade a username or role id for the name to show, so the
  // rosters have to be in memory before the first message renders.
  await Promise.all([members.load(), roles.load()]);
  const firstText = channels.list.find((c) => c.type === ChannelType.Text);
  if (firstText) await selectChannel(firstText.id);

  const token = session.token;
  if (token) realtime.start(token, { event: dispatch, resync });
}

async function resync() {
  // Whatever was on screen when the socket dropped is long stale by now.
  typing.clear();
  await channels.load();
  await unread.load();
  if (channels.currentId) await messages.load(channels.currentId);
}

function dispatch(event: ServerEvent) {
  switch (event.type) {
    case ServerEventType.Message_New:
      onMessage(event.message);
      break;
    case ServerEventType.Message_Edited:
      messages.applyEdit(event.message);
      break;
    case ServerEventType.Message_Deleted:
      messages.remove(event.id);
      break;
    case ServerEventType.Message_Reacted:
      messages.applyReactions(event.id, event.reactions);
      break;
    case ServerEventType.Presence:
      presence.setOnline(event.online);
      typing.keepOnly(event.online);
      break;
    case ServerEventType.Typing_Started:
      typing.started(event.channelId, event.userId);
      break;
    case ServerEventType.Voice_Presence:
      presence.setVoice(event.presence);
      break;
    case ServerEventType.Community_Renamed:
      community.name = event.name;
      break;
    case ServerEventType.Community_Icon_Changed:
      community.iconVersion = event.iconVersion;
      break;
    case ServerEventType.Roles_Changed:
      void onRolesChanged();
      break;
    case ServerEventType.Error:
      toast.error(event.message);
      break;
  }
}

async function onRolesChanged() {
  await session.refresh();
  await Promise.all([roles.load(true), members.load(true)]);
  messages.applyColors(new Map(members.list.map((m) => [m.id, m.color])));
}

function onMessage(m: MessageView) {
  // The message is the proof that they finished, and it beats waiting out the
  // typing timeout to say so.
  if (m.author) typing.stopped(m.channelId, m.author.id);

  // A reader sitting in old history has the channel open but cannot see its
  // newest messages, so those badge and ping like any other channel's would.
  const isCurrent = m.channelId === channels.currentId && !messages.detached;
  if (isCurrent) messages.append(m);

  if (m.systemEvent) return; // ambient status: never ping or badge
  if (m.author?.id === session.user?.id) return; // your own message: never notify
  const focused = typeof document !== "undefined" && document.hasFocus();
  const mentioned = pingsMe(m);

  if (isCurrent) {
    // The open channel never badges; keep its read marker current so it stays at
    // zero across reloads.
    unread.scheduleMarkRead(m.channelId);
    if (!focused && prefs.soundEnabled) playPing();
  } else {
    unread.bump(m.channelId, mentioned);
    if (prefs.soundEnabled) playPing();
  }
}
