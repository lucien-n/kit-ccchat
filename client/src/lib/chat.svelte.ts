import { api, apiBase, type Channel, type MessageView, type PublicUser, type VoiceMember } from './api';
import { playPing, unlockAudio } from './notify';

type Status = 'disconnected' | 'connecting' | 'connected';

function wsUrl(token: string): string {
  const u = new URL(apiBase() || location.origin);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.pathname = '/ws';
  u.search = `?token=${encodeURIComponent(token)}`;
  return u.toString();
}

/** Single reactive app store (Svelte 5 runes). One instance is exported and
 *  shared across every component. */
class ChatStore {
  token = $state<string | null>(null);
  user = $state<PublicUser | null>(null);
  serverName = $state('ccchat');

  channels = $state<Channel[]>([]);
  currentChannelId = $state<string | null>(null);
  messages = $state<MessageView[]>([]);
  online = $state<Set<string>>(new Set());
  status = $state<Status>('disconnected');

  /** Per-channel unread counts (channelId -> count). Deeply reactive. */
  unread = $state<Record<string, number>>({});
  /** Who is connected to each voice channel (channelId -> members). */
  voicePresence = $state<Record<string, VoiceMember[]>>({});
  /** Whether the notification sound plays. Persisted to localStorage. */
  soundEnabled = $state(true);

  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readTimer: ReturnType<typeof setTimeout> | null = null;

  get currentChannel(): Channel | null {
    return this.channels.find((c) => c.id === this.currentChannelId) ?? null;
  }

  get isAdmin(): boolean {
    return this.user?.role === 'admin' || this.user?.role === 'owner';
  }

  get totalUnread(): number {
    return Object.values(this.unread).reduce((a, b) => a + b, 0);
  }

  /** Clear the unread count for the channel currently in view (persisted). */
  markCurrentRead() {
    if (this.currentChannelId) void this.markRead(this.currentChannelId);
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('soundEnabled', this.soundEnabled ? '1' : '0');
  }

  /** Restore a saved session on app start, if any. */
  async init() {
    this.soundEnabled = localStorage.getItem('soundEnabled') !== '0';
    // Clear the current channel's badge when the user returns to the tab.
    window.addEventListener('focus', () => this.markCurrentRead());
    // Satisfy the browser autoplay policy so the first ping can play.
    window.addEventListener('pointerdown', () => unlockAudio(), { once: true });

    try {
      this.serverName = (await api.info()).name;
    } catch {
      /* server may be unreachable; login screen will surface it */
    }
    const saved = localStorage.getItem('token');
    if (!saved) return;
    try {
      this.user = (await api.me(saved)).user;
      this.token = saved;
      await this.afterLogin();
    } catch {
      localStorage.removeItem('token');
    }
  }

  async login(username: string, password: string) {
    const { token, user } = await api.login({ username, password });
    this.setSession(token, user);
    await this.afterLogin();
  }

  async register(inviteCode: string, username: string, password: string, displayName?: string) {
    const { token, user } = await api.register({ inviteCode, username, password, displayName });
    this.setSession(token, user);
    await this.afterLogin();
  }

  private setSession(token: string, user: PublicUser) {
    this.token = token;
    this.user = user;
    localStorage.setItem('token', token);
  }

  private async afterLogin() {
    await this.loadChannels();
    await this.loadUnreads();
    const firstText = this.channels.find((c) => c.type === 'text');
    if (firstText) await this.selectChannel(firstText.id);
    this.connect();
  }

  async loadChannels() {
    if (!this.token) return;
    this.channels = (await api.channels(this.token)).channels;
  }

  /** Load persisted unread counts from the server. */
  async loadUnreads() {
    if (!this.token) return;
    try {
      this.unread = (await api.unreads(this.token)).unreads ?? {};
    } catch {
      /* leave badges empty if it fails */
    }
  }

  /** Clear a channel's badge and persist the read marker on the server. */
  async markRead(channelId: string) {
    this.unread[channelId] = 0;
    if (this.token) await api.markRead(this.token, channelId).catch(() => {});
  }

  /** Debounced markRead, used while actively viewing a channel so a burst of
   *  messages results in a single write. */
  private scheduleMarkRead(channelId: string) {
    if (this.readTimer) clearTimeout(this.readTimer);
    this.readTimer = setTimeout(() => void this.markRead(channelId), 1200);
  }

  async selectChannel(id: string) {
    if (!this.token) return;
    this.currentChannelId = id;
    void this.markRead(id); // opening a channel clears + persists its read state
    const channel = this.channels.find((c) => c.id === id);
    if (!channel || channel.type !== 'text') {
      this.messages = [];
      return;
    }
    this.messages = (await api.history(this.token, id)).messages;
  }

  // ── realtime ───────────────────────────────────────────────────────────────

  private connect() {
    if (!this.token || this.ws) return;
    this.status = 'connecting';
    const ws = new WebSocket(wsUrl(this.token));
    this.ws = ws;

    ws.onopen = () => (this.status = 'connected');
    ws.onclose = () => {
      this.status = 'disconnected';
      this.ws = null;
      if (this.token) this.reconnectTimer = setTimeout(() => this.connect(), 1500);
    };
    ws.onmessage = (ev) => this.onEvent(JSON.parse(ev.data));
  }

  private onEvent(event: any) {
    switch (event.type) {
      case 'message.new': {
        const m = event.message as MessageView;
        const isCurrent = m.channelId === this.currentChannelId;
        if (isCurrent) this.messages = [...this.messages, m];

        if (m.author?.id === this.user?.id) break; // your own message: never notify
        const focused = typeof document !== 'undefined' && document.hasFocus();

        if (isCurrent) {
          // The open channel never badges — you're reading it. Keep its read
          // marker current so it stays at zero across reloads.
          this.scheduleMarkRead(m.channelId);
          if (!focused && this.soundEnabled) playPing();
        } else {
          this.unread[m.channelId] = (this.unread[m.channelId] ?? 0) + 1;
          if (this.soundEnabled) playPing();
        }
        break;
      }
      case 'message.deleted':
        if (event.channelId === this.currentChannelId)
          this.messages = this.messages.filter((m) => m.id !== event.id);
        break;
      case 'presence':
        this.online = new Set(event.online);
        break;
      case 'voice.presence':
        this.voicePresence = event.presence ?? {};
        break;
    }
  }

  /** Tell the server which voice channel we joined (or left, with null) so it can
   *  broadcast voice presence to everyone. */
  setVoiceChannel(channelId: string | null) {
    if (!this.ws || this.status !== 'connected') return;
    this.ws.send(
      JSON.stringify(channelId ? { type: 'voice.join', channelId } : { type: 'voice.leave' }),
    );
  }

  /** Patch the logged-in user locally (after a profile/avatar change). */
  patchUser(patch: Partial<PublicUser>) {
    if (this.user) this.user = { ...this.user, ...patch };
  }

  send(content: string) {
    if (!this.ws || this.status !== 'connected' || !this.currentChannelId) return;
    this.ws.send(
      JSON.stringify({ type: 'message.create', channelId: this.currentChannelId, content }),
    );
  }

  async deleteMessage(id: string) {
    if (!this.token) return;
    await api.deleteMessage(this.token, id); // server broadcasts the removal
  }

  async logout() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.readTimer) clearTimeout(this.readTimer);
    const token = this.token;
    this.ws?.close();
    this.ws = null;
    this.token = null;
    this.user = null;
    this.messages = [];
    this.channels = [];
    this.unread = {};
    this.voicePresence = {};
    localStorage.removeItem('token');
    if (token) await api.logout(token).catch(() => {});
  }
}

export const chat = new ChatStore();
