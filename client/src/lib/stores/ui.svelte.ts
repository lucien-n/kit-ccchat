import { ChannelType } from "@ccchat/shared";

class Ui {
  settings = $state(false);
  communitySettings = $state(false);
  createChannel = $state(false);
  createChannelType = $state<ChannelType>(ChannelType.Text);
  nav = $state(false);

  openSettings() {
    this.nav = false;
    this.settings = true;
  }

  openCommunitySettings() {
    this.nav = false;
    this.communitySettings = true;
  }

  openCreateChannel(type: ChannelType) {
    this.nav = false;
    this.createChannelType = type;
    this.createChannel = true;
  }
}

export const ui = new Ui();
