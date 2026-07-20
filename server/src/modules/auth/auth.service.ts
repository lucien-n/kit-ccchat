import { SystemEvent, type LoginBody, type RegisterBody } from "@ccchat/shared";
import { eq, sql } from "drizzle-orm";
import { createSession, hashPassword, newId, verifyPassword } from "../../auth.js";
import { db } from "../../db/index.js";
import { invites, users } from "../../db/schema";
import { httpError } from "../../http/errors.js";
import { toMember } from "../../views.js";
import * as messagesService from "../messages/messages.service.js";

export function register(body: RegisterBody) {
  const { inviteCode, username, password } = body;
  const displayName = body.displayName || username;

  const invite = db.select().from(invites).where(eq(invites.code, inviteCode)).get();
  if (!invite || invite.revoked) httpError(400, "invalid invite code");
  if (invite.expiresAt && invite.expiresAt < Date.now())
    httpError(400, "invite code expired");
  if (invite.maxUses !== 0 && invite.uses >= invite.maxUses)
    httpError(400, "invite code already used up");

  const countedInvite = { uses: sql`${invites.uses} + 1` };

  const existing = db.select().from(users).where(eq(users.username, username)).get();
  if (existing) {
    // A kicked account returns by redeeming a fresh invite with the password it
    // already had. Requiring the password keeps an invite holder from claiming
    // someone else's name and inheriting their history.
    if (!existing.kickedAt || !verifyPassword(password, existing.passwordHash))
      httpError(409, "username taken");

    db.transaction((tx) => {
      tx.update(users).set({ kickedAt: null }).where(eq(users.id, existing.id)).run();
      tx.update(invites).set(countedInvite).where(eq(invites.code, inviteCode)).run();
    });

    const token = createSession(existing.id);
    messagesService.postSystemMessage(SystemEvent.Member_Join, existing.id);
    return { token, user: toMember(existing) };
  }

  const user = {
    id: newId(),
    username,
    displayName,
    passwordHash: hashPassword(password),
    isOwner: 0,
    createdAt: Date.now(),
    banned: 0,
  };
  // An account must never exist without its invite counted, or a single-use
  // link would let a second person in.
  db.transaction((tx) => {
    tx.insert(users).values(user).run();
    tx.update(invites).set(countedInvite).where(eq(invites.code, inviteCode)).run();
  });

  const token = createSession(user.id);
  messagesService.postSystemMessage(SystemEvent.Member_Join, user.id);
  return { token, user: toMember(user) };
}

export function login({ username, password }: LoginBody) {
  const user = db.select().from(users).where(eq(users.username, username)).get();
  if (!user || !verifyPassword(password, user.passwordHash))
    httpError(401, "invalid username or password");
  if (user.banned) httpError(403, "account banned");
  if (user.kickedAt)
    httpError(
      403,
      "you were removed from this community, an invite is required to return",
    );

  return { token: createSession(user.id), user: toMember(user) };
}
