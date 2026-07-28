import type { Component } from "svelte";
import SettingsDialog from "./settings-dialog.svelte";
import ProfileTab from "./profile-tab.svelte";
import AppearanceTab from "./appearance-tab.svelte";

export enum SettingsDialogTab {
  Profile = "Profile",
  Appearance = "Appearance",
}

export const SETTINGS_DIALOG_TAB_SPECS: Record<
  SettingsDialogTab,
  { title: string; component: Component }
> = {
  [SettingsDialogTab.Profile]: {
    title: "Profile",
    component: ProfileTab,
  },
  [SettingsDialogTab.Appearance]: {
    title: "Appearance",
    component: AppearanceTab,
  },
};

export { SettingsDialog };
