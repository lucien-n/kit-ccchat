import {
  MAX_AVATAR_IMAGE_BYTES,
  MAX_BANNER_IMAGE_BYTES,
  Theme,
  ThemeMode,
  type AppearanceView,
  type AvatarBody,
  type BannerBody,
  type ChangePasswordBody,
  type Member,
  type Role,
  type UpdateAppearanceBody,
  type UpdateProfileBody,
} from "@ccchat/shared";
import { desc, eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../../auth.js";
import { db } from "../../db/index.js";
import { rolesTable, userRolesTable, usersTable, type User } from "../../db/schema";
import { AVATARS_DIR, BANNERS_DIR } from "../../env.js";
import { httpError } from "../../http/errors.js";
import { decodeImageUpload, imageStore, type StoredImage } from "../../images.js";
import { toMember, toRoleView } from "../../views.js";

const avatars = imageStore(AVATARS_DIR);
const banners = imageStore(BANNERS_DIR);

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

export function readBanner(id: string): StoredImage {
  return banners.read(id);
}

export function saveBanner(userId: string, { image }: BannerBody): number {
  banners.write(userId, decodeImageUpload(image, MAX_BANNER_IMAGE_BYTES));
  const bannerVersion = Date.now();
  db.update(usersTable).set({ bannerVersion }).where(eq(usersTable.id, userId)).run();
  return bannerVersion;
}

export function deleteBanner(userId: string) {
  banners.remove(userId);
  db.update(usersTable)
    .set({ bannerVersion: null })
    .where(eq(usersTable.id, userId))
    .run();
}

export function updateProfile(user: User, patch: UpdateProfileBody): Member {
  // Only the keys the request actually carried are written, so saving one field
  // never wipes another the caller left untouched.
  const fields: Partial<Pick<User, "displayName" | "accentColor">> = {};
  if (patch.displayName !== undefined) fields.displayName = patch.displayName;
  if (patch.accentColor !== undefined) fields.accentColor = patch.accentColor;

  if (Object.keys(fields).length)
    db.update(usersTable).set(fields).where(eq(usersTable.id, user.id)).run();

  return toMember({ ...user, ...fields });
}

export function getAppearance(user: User): AppearanceView {
  return {
    mode: (user.themeMode as ThemeMode | null) ?? ThemeMode.Dark,
    theme: (user.theme as Theme | null) ?? Theme.Default,
    reducedMotion: user.reducedMotion === 1,
  };
}

export function setAppearance(
  userId: string,
  body: UpdateAppearanceBody,
): AppearanceView {
  db.update(usersTable)
    .set({
      themeMode: body.mode,
      theme: body.theme,
      reducedMotion: body.reducedMotion ? 1 : 0,
    })
    .where(eq(usersTable.id, userId))
    .run();
  return body;
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
