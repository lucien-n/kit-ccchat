import { z } from "zod";
import {
  dataUrl,
  imageDataUrl,
  MAX_SOUNDBOARD_DURATION_MS,
  MAX_SOUNDBOARD_NAME,
} from "../primitives.js";

export const uploadImageBody = z.object({
  image: imageDataUrl,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type UploadImageBody = z.infer<typeof uploadImageBody>;

// Avatar, banner and community icon are all a single base64 image field; the
// bytes are decoded and constrained server-side, so the bodies are the same.
const imageUploadBody = z.object({ image: imageDataUrl });

export const avatarBody = imageUploadBody;
export type AvatarBody = z.infer<typeof avatarBody>;

export const bannerBody = imageUploadBody;
export type BannerBody = z.infer<typeof bannerBody>;

export const communityIconBody = imageUploadBody;
export type CommunityIconBody = z.infer<typeof communityIconBody>;

export const uploadSoundBody = z.object({
  sound: dataUrl,
  name: z.string().trim().min(1).max(MAX_SOUNDBOARD_NAME),
  emoji: z.string().trim().max(8).optional(),
  durationMs: z.number().int().positive().max(MAX_SOUNDBOARD_DURATION_MS),
});
export type UploadSoundBody = z.infer<typeof uploadSoundBody>;

export const updateSoundBody = uploadSoundBody.pick({ emoji: true, name: true });
export type UpdateSoundBody = z.infer<typeof updateSoundBody>;
