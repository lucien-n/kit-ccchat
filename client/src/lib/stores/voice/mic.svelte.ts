import { errorName } from "$lib/forms";
import { playMute, playUnmute } from "$lib/notify";
import { realtime } from "$lib/stores/realtime.svelte";
import { ClientEventType } from "@ccchat/shared";
import { MicStatus, type VoiceCore } from "./context";

export class MicController {
  status = $state<MicStatus>(MicStatus.Muted);
  deafened = $state(false);

  private mutedByDeafen = false;
  // The server can silence our track but can't turn it back on, so we re-enable
  // the mic ourselves when a mod mute lifts.
  private mutedByMod = false;
  private selfMutedBeforeMod = false;

  constructor(private core: VoiceCore) {}

  get localMuted(): boolean {
    return this.status !== MicStatus.Enabled;
  }

  initForCall(canPublish: boolean) {
    this.mutedByMod = !canPublish;
    this.status = canPublish ? MicStatus.Enabled : MicStatus.MutedByMod;
  }

  async engage() {
    const lp = this.core.room?.localParticipant;
    try {
      await lp?.setMicrophoneEnabled(true);
    } catch (err) {
      this.status =
        errorName(err) === "NotAllowedError" ? MicStatus.NotAllowed : MicStatus.Muted;
    }
  }

  announce() {
    realtime.send({ type: ClientEventType.Mic_Set, muted: this.localMuted });
  }

  async toggle() {
    const enabling = this.status !== MicStatus.Enabled;
    const changed = await this.apply(enabling);
    if (!changed) return;
    if (enabling && this.deafened) this.setDeafened(false);
    this.mutedByDeafen = false;
  }

  async applyModMute(forceMuted: boolean) {
    if (!this.core.inCall || forceMuted === this.mutedByMod) return;
    const lp = this.core.room?.localParticipant;

    if (forceMuted) {
      this.mutedByMod = true;
      this.selfMutedBeforeMod = this.status === MicStatus.Muted;
      this.core.canPublish = false;
      this.status = MicStatus.MutedByMod;
      await lp?.setMicrophoneEnabled(false).catch(() => {});
      this.core.refresh();
      return;
    }

    this.mutedByMod = false;
    this.core.canPublish = true;
    if (this.selfMutedBeforeMod) {
      this.status = MicStatus.Muted;
      this.announce();
      this.core.refresh();
    } else {
      await this.apply(true);
    }
  }

  private async apply(enabling: boolean): Promise<boolean> {
    const lp = this.core.room?.localParticipant;
    if (!lp || !this.core.canPublish) return false;
    try {
      await lp.setMicrophoneEnabled(enabling);
    } catch (err) {
      if (errorName(err) === "NotAllowedError") {
        this.status = MicStatus.NotAllowed;
        this.announce();
      }
      return false;
    }
    this.status = enabling ? MicStatus.Enabled : MicStatus.Muted;
    this.announce();
    if (enabling) playUnmute();
    else playMute();
    this.core.refresh();
    return true;
  }

  async toggleDeafen() {
    const next = !this.deafened;
    this.setDeafened(next);
    if (next) {
      if (this.status === MicStatus.Enabled) {
        this.mutedByDeafen = await this.apply(false);
      }
    } else if (this.mutedByDeafen) {
      this.mutedByDeafen = false;
      if (this.status === MicStatus.Muted) await this.apply(true);
    }
  }

  private setDeafened(value: boolean) {
    if (this.deafened === value) return;
    this.deafened = value;
    this.core.audio.setDeafened(value, this.core.streamAudio);
    realtime.send({ type: ClientEventType.Deafen_Set, deafened: value });
    this.core.refresh();
  }

  // Keeps status so the mic icon doesn't flash muted mid channel-switch.
  resetKeepingStatus() {
    this.deafened = false;
    this.mutedByDeafen = false;
    this.mutedByMod = false;
    this.selfMutedBeforeMod = false;
  }

  reset() {
    this.status = MicStatus.Muted;
    this.resetKeepingStatus();
  }
}
