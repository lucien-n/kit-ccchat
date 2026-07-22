import {
  MAX_AVATAR_IMAGE_BYTES,
  type AvatarBody,
  type ChangePasswordBody,
  type Member,
  type Role,
} from "@ccchat/shared";
import { desc, eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../../auth.js";
import { db } from "../../db/index.js";
import { rolesTable, userRolesTable, usersTable, type User } from "../../db/schema";
import { httpError } from "../../http/errors.js";
import { decodeImageUpload, imageStore, type StoredImage } from "../../images.js";
import { toMember, toRoleView } from "../../views.js";

const avatars = imageStore("avatars");

export function listMembers(): Member[] {
  return db
    .select()
    .from(usersTable)
    .all()
    .filter((u) => !u.banned)
    .map(toMember);
}

export function readAvatar(id: string): StoredImage {
  return avatars.read(id);
}

export function saveAvatar(userId: string, { image }: AvatarBody): number {
  avatars.write(userId, decodeImageUpload(image, MAX_AVATAR_IMAGE_BYTES));
  const avatarVersion = Date.now();
  db.update(usersTable).set({ avatarVersion }).where(eq(usersTable.id, userId)).run();
  return avatarVersion;
}

export function deleteAvatar(userId: string) {
  avatars.remove(userId);
  db.update(usersTable)
    .set({ avatarVersion: null })
    .where(eq(usersTable.id, userId))
    .run();
}

export function updateProfile(user: User, displayName: string): Member {
  db.update(usersTable).set({ displayName }).where(eq(usersTable.id, user.id)).run();
  return toMember({ ...user, displayName });
}

export function changePassword(
  user: User,
  { currentPassword, newPassword }: ChangePasswordBody,
) {
  if (!verifyPassword(currentPassword, user.passwordHash))
    httpError(403, "current password is incorrect");

  db.update(usersTable)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(usersTable.id, user.id))
    .run();
}

export function getUser(id: string): { user: Member; roles: Role[] } {
  const u = db.select().from(usersTable).where(eq(usersTable.id, id)).get();
  if (!u) httpError(404, "user not found");

  const assigned = db
    .select({
      id: rolesTable.id,
      name: rolesTable.name,
      color: rolesTable.color,
      permission: rolesTable.permission,
      position: rolesTable.position,
      createdAt: rolesTable.createdAt,
    })
    .from(userRolesTable)
    .innerJoin(rolesTable, eq(userRolesTable.roleId, rolesTable.id))
    .where(eq(userRolesTable.userId, id))
    .orderBy(desc(rolesTable.position))
    .all();

  return { user: toMember(u), roles: assigned.map(toRoleView) };
}
