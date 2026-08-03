import { z } from "zod";

export enum ThemeMode {
  Light = "light",
  Dark = "dark",
  System = "system",
}
export const themeMode = z.enum(ThemeMode);

export enum Theme {
  Default = "default",
  Tangerine = "tangerine",
  Notebook = "notebook",
  Whatsapp = "whatsapp",
  Neobrutalism = "neobrutalism",
  Custom = "custom",
}
export const theme = z.enum(Theme);

export const themeRadius = z.number().min(0).max(1);
