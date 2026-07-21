import {
  EVERYONE,
  ROLE_ID_BODY,
  trimUsername,
  USERNAME_BODY,
  USERNAME_MIN_LEN,
} from "@ccchat/shared";
import type { PluginSimple } from "markdown-it";

export interface ResolvedMention {
  label: string;
  color?: string | null;
  self?: boolean;
}

export interface MentionResolver {
  user(username: string): ResolvedMention | null;
  role(roleId: string): ResolvedMention | null;
  everyone(): ResolvedMention;
}

export interface MentionEnv {
  mentions?: MentionResolver;
}

type Meta =
  | { kind: "user"; raw: string; name: string }
  | { kind: "role"; raw: string; id: string }
  | { kind: "everyone"; raw: string };

const AT = 0x40;
const LT = 0x3c;

// Anchored at the cursor for inline scanning, but the same grammar the shared
// parser uses (see @ccchat/shared mentions).
const USER_AT = new RegExp(`^@(${USERNAME_BODY})`);
const ROLE_AT = new RegExp(`^<@&(${ROLE_ID_BODY})>`);

/** Runs ahead of linkify so an `@` it would have read as the start of an email
 *  gets first refusal here. */
export const mentions: PluginSimple = (md) => {
  md.inline.ruler.before("linkify", "mention", (state, silent) => {
    const code = state.src.charCodeAt(state.pos);
    if (code !== AT && code !== LT) return false;
    const rest = state.src.slice(state.pos);

    let meta: Meta;
    let width: number;

    if (code === LT) {
      const m = ROLE_AT.exec(rest);
      if (!m) return false;
      meta = { kind: "role", raw: m[0], id: m[1] };
      width = m[0].length;
    } else {
      // An @ glued to the end of a word belongs to that word, not to us.
      if (state.pos > 0 && /[\w@.-]/.test(state.src[state.pos - 1])) return false;
      const m = USER_AT.exec(rest);
      if (!m) return false;
      const name = trimUsername(m[1]);
      if (name.length < USERNAME_MIN_LEN) return false;
      meta =
        name === EVERYONE
          ? { kind: "everyone", raw: `@${name}` }
          : { kind: "user", raw: `@${name}`, name };
      // Any trailing punctuation the charset allowed is left in the source to be
      // rendered as the ordinary text it is.
      width = 1 + name.length;
    }

    if (!silent) state.push("mention", "", 0).meta = meta;
    state.pos += width;
    return true;
  });

  md.renderer.rules.mention = (tokens, i, _opts, env: MentionEnv) => {
    const meta = tokens[i].meta as Meta;
    const resolver = env?.mentions;

    const resolved =
      meta.kind === "everyone"
        ? resolver?.everyone()
        : meta.kind === "role"
          ? resolver?.role(meta.id)
          : resolver?.user(meta.name);

    // Nobody by that name, or no resolver at all: show what was typed.
    if (!resolved) return md.utils.escapeHtml(meta.raw);

    const attrs = [
      'class="mention"',
      resolved.self ? "data-self" : "",
      resolved.color ? `style="--mention:${md.utils.escapeHtml(resolved.color)}"` : "",
    ]
      .filter(Boolean)
      .join(" ");

    return `<span ${attrs}>@${md.utils.escapeHtml(resolved.label)}</span>`;
  };
};
