import {
  ChannelType,
  ServerEventType,
  type Member,
  type RegisterBody,
  type ServerEvent,
  type SetupBody,
  type VoiceMember,
} from "@motus/shared";
import { toast } from "svelte-sonner";
import { api, type MessageView } from "./api";
import { pingsMe } from "./mentions";
import { playPing, unlockAudio } from "./notify";
import {
  appearance,
  channels,
  community,
  members,
  messages,
  pins,
  prefs,
  presence,
  realtime,
  roles,
  search,
  session,
  soundboard,
  typing,
  unread,
  voice,
} from "$lib/stores";

export async function init() {
  prefs.init();
  soundboard.init();
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

export async function setup(body: SetupBody): Promise<void> {
  const { token, user, communityName } = await api.auth.setup(body);
  community.name = communityName;
  session.start(token, user);
  await afterLogin();
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
  pins.clear();
  channels.clear();
  presence.clear();
  typing.clear();
  members.clear();
  roles.clear();
  search.close();
  await session.end();
}

async function afterLogin() {
  // Fire-and-forget: theme is already painted from localStorage, so this just
  // reconciles it with the account's server-stored prefs (cross-device sync).
  void api.users
    .getAppearance()
    .then(({ appearance: prefs }) => appearance.hydrate(prefs))
    .catch(() => {});

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
    case ServerEventType.Message_Pinned:
      messages.applyPinned(event.id, event.pinned);
      pins.invalidate(event.channelId);
      break;
    case ServerEventType.Presence:
      presence.setOnline(event.online);
      typing.keepOnly(event.online);
      // A first-time joiner shows up as online before they exist in the roster,
      // so pull a fresh list when presence names someone we don't know yet.
      if (event.online.some((id) => !members.byId(id))) void members.load(true);
      break;
    case ServerEventType.Member_Updated:
      onMemberUpdated(event.member);
      break;
    case ServerEventType.Typing_Started:
      typing.started(event.channelId, event.userId);
      break;
    case ServerEventType.Voice_Presence:
      presence.setVoice(event.presence);
      onVoicePresence(event.presence);
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
    case ServerEventType.Voice_Moved:
      onVoiceMoved(event.channelId);
      break;
    case ServerEventType.Error:
      toast.error(event.message);
      break;
  }
}

/** Someone changed their profile (name, accent, avatar or banner). Update the
 *  roster; if it was us on another device, keep this session's own copy in step
 *  too. Rendered messages only carry the resolved color, so repaint them only
 *  when that actually moved - an avatar or banner change leaves it untouched. */
function onMemberUpdated(member: Member) {
  const colorChanged = members.byId(member.id)?.color !== member.color;
  members.apply(member);
  if (member.id === session.user?.id)
    session.patchUser({
      displayName: member.displayName,
      accentColor: member.accentColor,
      color: member.color,
      avatarVersion: member.avatarVersion,
      bannerVersion: member.bannerVersion,
    });
  if (colorChanged) recolorFromRoster();
}

/** Repaint already-rendered messages from the current roster's colors. */
function recolorFromRoster() {
  messages.applyColors(new Map(members.list.map((m) => [m.id, m.color])));
}

/** A moderator can mute or unmute us while we're in a call. LiveKit won't let the
 *  server turn our mic back on, so hand our own `forceMuted` flag to the voice
 *  store to restore (or lock) the mic locally. */
function onVoicePresence(byChannel: Record<string, VoiceMember[]>) {
  const me = session.user?.id;
  if (!me) return;
  for (const members of Object.values(byChannel)) {
    const self = members.find((m) => m.id === me);
    if (self) {
      void voice.applyModMute(self.forceMuted);
      return;
    }
  }
}

/** A moderator moved us. Only the device that's actually in a call follows, so
 *  a moved user isn't yanked into voice on a background tab. */
function onVoiceMoved(channelId: string) {
  if (!voice.inCall) return;
  const channel = channels.list.find((c) => c.id === channelId);
  if (channel?.type === ChannelType.Voice) void voice.join(channel);
}

async function onRolesChanged() {
  await session.refresh();
  await Promise.all([roles.load(true), members.load(true)]);
  recolorFromRoster();
}

/** Re-pull the roster and recolor rendered messages, so a color change (e.g. the
 *  member's own accent) shows up immediately instead of only after a reload. */
export async function refreshMemberColors() {
  await members.load(true);
  recolorFromRoster();
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
