import type { AvatarBody, ChangePasswordBody, Member, Role } from "@ccchat/shared";
import { desc, eq } from "drizzle-orm";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { hashPassword, verifyPassword } from "../../auth.js";
import { db } from "../../db/index.js";
import { roles, userRoles, users, type User } from "../../db/schema";
import { DATA_DIR } from "../../env.js";
import { httpError } from "../../http/errors.js";
import { decodeImageUpload, readImageFile, type StoredImage } from "../../images.js";
import { toMember, toRoleView } from "../../views.js";

const AVATAR_DIR = join(DATA_DIR, "avatars");
mkdirSync(AVATAR_DIR, { recursive: true });

/** Hono hands back the *decoded* param, so an id of `..%2Fccchat.sqlite` arrives
 *  as a relative path and join() would walk straight out of AVATAR_DIR. An
 *  avatar is always a direct child of it; anything else is someone probing. */
function avatarPath(id: string): string | null {
  const path = resolve(AVATAR_DIR, id);
  return dirname(path) === AVATAR_DIR ? path : null;
}

export function listMembers(): Member[] {
  return db
    .select()
    .from(users)
    .all()
    .filter((u) => !u.banned)
    .map(toMember);
}

export function readAvatar(id: string): StoredImage {
  const path = avatarPath(id);
  const image = path ? readImageFile(path) : null;
  if (!image) httpError(404, "not found");
  return image;
}

export function saveAvatar(userId: string, { image }: AvatarBody): number {
  writeFileSync(join(AVATAR_DIR, userId), decodeImageUpload(image));
  const avatarVersion = Date.now();
  db.update(users).set({ avatarVersion }).where(eq(users.id, userId)).run();
  return avatarVersion;
}

export function deleteAvatar(userId: string) {
  const path = join(AVATAR_DIR, userId);
  if (existsSync(path)) rmSync(path);
  db.update(users).set({ avatarVersion: null }).where(eq(users.id, userId)).run();
}

export function updateProfile(user: User, displayName: string): Member {
  db.update(users).set({ displayName }).where(eq(users.id, user.id)).run();
  return toMember({ ...user, displayName });
}

export function changePassword(
  user: User,
  { currentPassword, newPassword }: ChangePasswordBody,
) {
  if (!verifyPassword(currentPassword, user.passwordHash))
    httpError(403, "current password is incorrect");

  db.update(users)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(users.id, user.id))
    .run();
}

export function getUser(id: string): { user: Member; roles: Role[] } {
  const u = db.select().from(users).where(eq(users.id, id)).get();
  if (!u) httpError(404, "user not found");

  const assigned = db
    .select({
      id: roles.id,
      name: roles.name,
      color: roles.color,
      permission: roles.permission,
      position: roles.position,
      createdAt: roles.createdAt,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, id))
    .orderBy(desc(roles.position))
    .all();

  return { user: toMember(u), roles: assigned.map(toRoleView) };
}
