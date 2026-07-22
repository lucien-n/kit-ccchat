import { InviteStatus, type CreateInviteBody, type Invite } from "@ccchat/shared";
import { desc, eq } from "drizzle-orm";
import { randomToken } from "../../auth.js";
import { db } from "../../db/index.js";
import { invitesTable, usersTable } from "../../db/schema";
import { httpError } from "../../http/errors.js";

/** Derived state is resolved here so the client never re-implements the
 *  expiry/exhaustion rules that /api/auth/register enforces. */
function toInviteView(i: typeof invitesTable.$inferSelect): Invite {
  const exhausted = i.maxUses !== 0 && i.uses >= i.maxUses;
  const expired = i.expiresAt != null && i.expiresAt < Date.now();
  const creator = db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, i.createdBy))
    .get();
  return {
    code: i.code,
    createdAt: i.createdAt,
    createdBy: creator?.displayName ?? "unknown",
    maxUses: i.maxUses,
    uses: i.uses,
    expiresAt: i.expiresAt,
    revoked: !!i.revoked,
    active: !i.revoked && !exhausted && !expired,
    status: i.revoked
      ? InviteStatus.Revoked
      : expired
        ? InviteStatus.Expired
        : exhausted
          ? InviteStatus.Used_Up
          : InviteStatus.Active,
  };
}

export function createInvite(
  { maxUses, expiresInHours }: CreateInviteBody,
  createdBy: string,
): Invite {
  const expiresAt =
    expiresInHours && expiresInHours > 0 ? Date.now() + expiresInHours * 3600_000 : null;

  const invite = {
    code: randomToken(6),
    createdBy,
    createdAt: Date.now(),
    maxUses,
    uses: 0,
    expiresAt,
    revoked: 0,
  };
  db.insert(invitesTable).values(invite).run();
  return toInviteView(invite);
}

export function listInvites(): Invite[] {
  return db
    .select()
    .from(invitesTable)
    .orderBy(desc(invitesTable.createdAt))
    .all()
    .map(toInviteView);
}

/** The row is kept rather than deleted so the list stays an audit trail. */
export function revokeInvite(code: string): Invite {
  const invite = db.select().from(invitesTable).where(eq(invitesTable.code, code)).get();
  if (!invite) httpError(404, "no such invite");

  db.update(invitesTable).set({ revoked: 1 }).where(eq(invitesTable.code, code)).run();
  return toInviteView({ ...invite, revoked: 1 });
}
