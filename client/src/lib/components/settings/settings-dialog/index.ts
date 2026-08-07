import type { Component } from "svelte";
import AppearanceTab from "./appearance-tab.svelte";
import ProfileTab from "./profile-tab.svelte";
import SettingsDialog from "./settings-dialog.svelte";

export enum SettingsDialogTab {
  Profile = "Profile",
  Appearance = "Appearance",
}

// Titles are resolved in the dialog (via `m`) so they stay reactive to locale;
// keeping them out of this module-level object avoids freezing them at import.
export const SETTINGS_DIALOG_TAB_SPECS: Record<
  SettingsDialogTab,
  { component: Component }
> = {
  [SettingsDialogTab.Profile]: { component: ProfileTab },
  [SettingsDialogTab.Appearance]: { component: AppearanceTab },
};

export { SettingsDialog };
