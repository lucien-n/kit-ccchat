import { z } from "zod";
import { bio, displayName, hexColor } from "../primitives.js";
import { appearanceView, type AppearanceView } from "../views.js";

export const updateProfileBody = z.object({
  displayName: displayName.optional(),
  accentColor: hexColor.nullable().optional(),
  bio: bio.optional(),
});
export type UpdateProfileBody = z.infer<typeof updateProfileBody>;

export const updateAppearanceBody = appearanceView;
export type UpdateAppearanceBody = AppearanceView;
