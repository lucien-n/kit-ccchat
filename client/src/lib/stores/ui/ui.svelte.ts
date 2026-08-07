import { ChannelType } from "@motus/shared";

class Ui {
  isSettingsDialogOpen = $state(false);
  isCommunitySettingsDialogOpen = $state(false);
  isCreateChannelDialogOpen = $state(false);
  createChannelType = $state<ChannelType>(ChannelType.Text);
  // for mobiles, controls wether the sidebar is shown or not
  nav = $state(false);

  openSettings() {
    this.nav = false;
    this.isSettingsDialogOpen = true;
  }

  openCommunitySettings() {
    this.nav = false;
    this.isCommunitySettingsDialogOpen = true;
  }

  openCreateChannel(type: ChannelType) {
    this.nav = false;
    this.createChannelType = type;
    this.isCreateChannelDialogOpen = true;
  }
}

export const ui = new Ui();
