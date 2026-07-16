import type { RegisterBody, ServerEvent, SetupBody } from "@ccchat/shared";
import { toast } from "svelte-sonner";
import { api, type MessageView } from "./api";
import { playPing, unlockAudio } from "./notify";
import { channels } from "./stores/channels.svelte";
import { community } from "./stores/community.svelte";
import { messages } from "./stores/messages.svelte";
import { prefs } from "./stores/prefs.svelte";
import { presence } from "./stores/presence.svelte";
import { realtime } from "./stores/realtime.svelte";
import { session } from "./stores/session.svelte";
import { unread } from "./stores/unread.svelte";

/** Flows that span more than one store. The stores hold state and own their own
 *  fetches; anything that has to touch several of them in order lives here, so
 *  no store has to import a sibling just to coordinate. */

export async function init() {
  prefs.init();
  window.addEventListener("focus", () => {
    if (channels.currentId) void unread.markRead(channels.currentId);
  });
  // Satisfy the browser autoplay policy so the first ping can play.
  window.addEventListener("pointerdown", () => unlockAudio(), { once: true });

  await community.load();
  if (community.needsSetup) return; // no accounts yet, nothing to restore
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

/** Claim a fresh instance: name it and become its owner. Returns the invite code
 *  to share. `needsSetup` stays true so the wizard can show that code; it clears
 *  when the owner dismisses the screen. */
export async function setup(body: SetupBody): Promise<string> {
  const { token, user, inviteCode, communityName } = await api.setup(body);
  community.name = communityName;
  session.start(token, user);
  await afterLogin();
  return inviteCode;
}

export async function selectChannel(id: string) {
  channels.currentId = id;
  void unread.markRead(id); // opening a channel clears and persists its read state
  const channel = channels.list.find((c) => c.id === id);
  if (!channel || channel.type !== "text") {
    messages.clear();
    return;
  }
  await messages.load(id);
}

export async function logout() {
  realtime.stop();
  unread.clear();
  messages.clear();
  channels.clear();
  presence.clear();
  await session.end();
}

async function afterLogin() {
  await channels.load();
  await unread.load();
  const firstText = channels.list.find((c) => c.type === "text");
  if (firstText) await selectChannel(firstText.id);

  const token = session.token;
  if (token) realtime.start(token, { event: dispatch, resync });
}

/** Refetch everything the socket would have delivered during an outage. */
async function resync() {
  await channels.load();
  await unread.load();
  if (channels.currentId) await messages.load(channels.currentId);
}

function dispatch(event: ServerEvent) {
  switch (event.type) {
    case "message.new":
      onMessage(event.message);
      break;
    case "message.deleted":
      messages.remove(event.id);
      break;
    case "presence":
      presence.setOnline(event.online);
      break;
    case "voice.presence":
      presence.setVoice(event.presence);
      break;
    case "community.renamed":
      community.name = event.name;
      break;
    case "error":
      toast.error(event.message);
      break;
  }
}

function onMessage(m: MessageView) {
  const isCurrent = m.channelId === channels.currentId;
  if (isCurrent) messages.append(m);

  if (m.author?.id === session.user?.id) return; // your own message: never notify
  const focused = typeof document !== "undefined" && document.hasFocus();

  if (isCurrent) {
    // The open channel never badges, you're reading it. Keep its read marker
    // current so it stays at zero across reloads.
    unread.scheduleMarkRead(m.channelId);
    if (!focused && prefs.soundEnabled) playPing();
  } else {
    unread.bump(m.channelId);
    if (prefs.soundEnabled) playPing();
  }
}
