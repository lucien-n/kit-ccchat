import { m } from "$lib/paraglide/messages";
import type { Component } from "svelte";
import AppearanceTab from "./appearance-tab.svelte";
import ProfileTab from "./profile-tab.svelte";
import SettingsDialog from "./settings-dialog.svelte";

export enum SettingsDialogTab {
  Profile = "Profile",
  Appearance = "Appearance",
}

export const SETTINGS_DIALOG_TAB_SPECS: Record<
  SettingsDialogTab,
  { title: () => string; component: Component }
> = {
  [SettingsDialogTab.Profile]: {
    title: m.settings_tab_profile,
    component: ProfileTab,
  },
  [SettingsDialogTab.Appearance]: {
    title: m.settings_tab_appearance,
    component: AppearanceTab,
  },
};

export { SettingsDialog };
