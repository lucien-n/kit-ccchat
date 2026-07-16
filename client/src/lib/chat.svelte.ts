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

class ChatStore {
  token = $state<string | null>(null);
  user = $state<PublicUser | null>(null);
  serverName = $state('ccchat');
  /** True on a brand-new instance with no accounts: show the setup wizard
   *  instead of a login form, so the first visitor claims it as owner. */
  needsSetup = $state(false);

  channels = $state<Channel[]>([]);
  currentChannelId = $state<string | null>(null);
  messages = $state<MessageView[]>([]);
  online = $state<Set<string>>(new Set());
  status = $state<Status>('disconnected');

  unread = $state<Record<string, number>>({});
  voicePresence = $state<Record<string, VoiceMember[]>>({});
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

  markCurrentRead() {
    if (this.currentChannelId) void this.markRead(this.currentChannelId);
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('soundEnabled', this.soundEnabled ? '1' : '0');
  }

  async init() {
    this.soundEnabled = localStorage.getItem('soundEnabled') !== '0';
    window.addEventListener('focus', () => this.markCurrentRead());
    // Satisfy the browser autoplay policy so the first ping can play.
    window.addEventListener('pointerdown', () => unlockAudio(), { once: true });

    try {
      const info = await api.info();
      this.serverName = info.name;
      this.needsSetup = info.needsSetup;
    } catch {
      /* server may be unreachable; login screen will surface it */
    }
    if (this.needsSetup) return; // nothing to restore — there are no accounts yet

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

  /** Claim a fresh instance: name it and become its owner. Returns the invite
   *  code to share with friends. */
  async setup(input: { communityName: string; username: string; password: string }) {
    const { token, user, inviteCode, communityName } = await api.setup(input);
    this.serverName = communityName;
    this.setSession(token, user);
    await this.afterLogin();
    // `needsSetup` stays true so the wizard can show the invite code; it clears
    // it when the owner dismisses that screen.
    return inviteCode;
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

  async loadUnreads() {
    if (!this.token) return;
    try {
      this.unread = (await api.unreads(this.token)).unreads ?? {};
    } catch {
      /* leave badges empty if it fails */
    }
  }

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
      case 'community.renamed':
        this.serverName = event.name;
        break;
    }
  }

  setVoiceChannel(channelId: string | null) {
    if (!this.ws || this.status !== 'connected') return;
    this.ws.send(
      JSON.stringify(channelId ? { type: 'voice.join', channelId } : { type: 'voice.leave' }),
    );
  }

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
