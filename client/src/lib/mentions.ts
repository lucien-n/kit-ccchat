import type { MentionResolver } from "$lib/markdown";
import { EVERYONE, USERNAME_CHARS } from "@ccchat/shared";
import { members } from "./stores/members.svelte";
import { roles } from "./stores/roles.svelte";
import { session } from "./stores/session.svelte";

export function mentionResolver(): MentionResolver {
  const meId = session.user?.id;
  return {
    user(username) {
      const m = members.list.find((x) => x.username === username);
      if (!m) return null;
      return { label: m.displayName, color: m.color, self: m.id === meId };
    },
    role(roleId) {
      const r = roles.byId(roleId);
      return r ? { label: r.name, color: r.color } : null;
    },
    everyone: () => ({ label: EVERYONE, self: true }),
  };
}

export function pingsMe(message: { mentions: string[]; mentionsEveryone: boolean }) {
  const meId = session.user?.id;
  if (!meId) return false;
  return message.mentionsEveryone || message.mentions.includes(meId);
}

// Same handle charset as the parser, but unbounded: it matches what has been
// typed so far rather than a complete username.
const QUERY = new RegExp(`(?:^|[\\s([{<])@([${USERNAME_CHARS}]*)$`);

export function mentionQuery(before: string): { start: number; query: string } | null {
  const m = QUERY.exec(before);
  if (!m) return null;
  return { start: before.length - m[1].length - 1, query: m[1].toLowerCase() };
}

export interface MentionSuggestion {
  key: string;
  /** What gets written into the message. */
  token: string;
  label: string;
  detail: string;
  color: string | null;
  kind: "user" | "role" | "everyone";
}

export function searchMentions(query: string, limit = 8): MentionSuggestion[] {
  const q = query.toLowerCase();
  const hit = (s: string) => s.toLowerCase().includes(q);

  const people: MentionSuggestion[] = members.list
    .filter((m) => !m.banned && (hit(m.username) || hit(m.displayName)))
    .map((m) => ({
      key: `u:${m.id}`,
      token: `@${m.username}`,
      label: m.displayName,
      detail: `@${m.username}`,
      color: m.color,
      kind: "user" as const,
    }));

  const roleHits: MentionSuggestion[] = roles.list
    .filter((r) => hit(r.name))
    .map((r) => ({
      key: `r:${r.id}`,
      token: `<@&${r.id}>`,
      label: r.name,
      detail: "role",
      color: r.color,
      kind: "role" as const,
    }));

  const all = [...people, ...roleHits];
  if (EVERYONE.includes(q))
    all.push({
      key: "everyone",
      token: `@${EVERYONE}`,
      label: EVERYONE,
      detail: "notifies the whole community",
      color: null,
      kind: "everyone",
    });

  // An exact handle is what you meant; otherwise a name that starts with what
  // you typed beats one that merely contains it.
  const rank = (s: MentionSuggestion) =>
    s.detail === `@${q}` || s.label.toLowerCase() === q
      ? 0
      : s.label.toLowerCase().startsWith(q) || s.detail.startsWith(`@${q}`)
        ? 1
        : 2;

  return all.sort((a, b) => rank(a) - rank(b)).slice(0, limit);
}
