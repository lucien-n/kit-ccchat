import { z } from "zod";
import { displayName, hexColor } from "../primitives.js";
import { appearanceView, type AppearanceView } from "../views.js";

export const updateProfileBody = z.object({
  displayName: displayName.optional(),
  accentColor: hexColor.nullable().optional(),
});
export type UpdateProfileBody = z.infer<typeof updateProfileBody>;

export const updateAppearanceBody = appearanceView;
export type UpdateAppearanceBody = AppearanceView;
