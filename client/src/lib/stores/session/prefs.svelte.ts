/** Client-only chat preferences. Appearance has its own store; these are the
 *  ones that change how the chat behaves rather than how it looks. */
class Prefs {
  soundEnabled = $state(true);
  membersPanel = $state(false);

  init() {
    this.soundEnabled = localStorage.getItem("soundEnabled") !== "0";
    this.membersPanel = localStorage.getItem("membersPanel") === "1";
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem("soundEnabled", this.soundEnabled ? "1" : "0");
  }

  setMembersPanel(open: boolean) {
    this.membersPanel = open;
    localStorage.setItem("membersPanel", open ? "1" : "0");
  }
}

export const prefs = new Prefs();
