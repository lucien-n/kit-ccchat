/** Mentions live in the message text itself. People are written as `@username`
 *  because a username is unique and can never be changed, so the text stays
 *  correct forever and reads like plain writing in the composer. Roles are
 *  written as `<@&id>` instead: role names are renameable, may collide, and can
 *  contain spaces, so a name could not be resolved or even parsed out of running
 *  text. `@everyone` is the literal word. */

export const EVERYONE = "everyone";

// The one place the grammar is defined. The server parser, the client renderer,
// and the composer's autocomplete query all build their regexes from these, so
// widening what a handle may contain can't drift between reading and writing.
export const USERNAME_CHARS = "A-Za-z0-9_.-";
export const USERNAME_MIN_LEN = 2;
export const USERNAME_MAX_LEN = 24;
export const USERNAME_BODY = `[${USERNAME_CHARS}]{${USERNAME_MIN_LEN},${USERNAME_MAX_LEN}}`;
export const ROLE_ID_BODY = "[A-Za-z0-9_-]{1,64}";

const ROLE = `<@&(${ROLE_ID_BODY})>`;
/** Rejects a leading word char so an email address is never read as a mention. */
const USER = `(?<![\\w@.-])@(${USERNAME_BODY})`;

const MENTION = new RegExp(`${ROLE}|${USER}`, "g");

/** A username may not end in `.` or `-`, so sentence punctuation the charset
 *  happens to allow is not part of the name. */
export const trimUsername = (raw: string) => raw.toLowerCase().replace(/[.-]+$/, "");

export interface ParsedMentions {
  usernames: string[];
  roleIds: string[];
  everyone: boolean;
}

export function parseMentions(content: string): ParsedMentions {
  const usernames = new Set<string>();
  const roleIds = new Set<string>();
  let everyone = false;

  for (const [, roleId, rawName] of content.matchAll(MENTION)) {
    if (roleId) {
      roleIds.add(roleId);
      continue;
    }
    const name = trimUsername(rawName);
    if (name.length < USERNAME_MIN_LEN) continue;
    if (name === EVERYONE) everyone = true;
    else usernames.add(name);
  }

  return { usernames: [...usernames], roleIds: [...roleIds], everyone };
}
