import { errorName } from "$lib/forms";
import { playMute, playUnmute } from "$lib/notify";
import { realtime } from "$lib/stores/realtime.svelte";
import { ClientEventType } from "@ccchat/shared";
import { MicStatus, type VoiceCore } from "./context";

export class MicController {
  status = $state<MicStatus>(MicStatus.Enabled);
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
    if (!canPublish) {
      this.status = MicStatus.MutedByMod;
    } else if (this.status !== MicStatus.Muted) {
      // Respect a mute chosen before joining; otherwise open the mic.
      this.status = MicStatus.Enabled;
    }
  }

  async engage() {
    const lp = this.core.room?.localParticipant;
    try {
      await lp?.setMicrophoneEnabled(this.status === MicStatus.Enabled);
    } catch (err) {
      this.status =
        errorName(err) === "NotAllowedError" ? MicStatus.NotAllowed : MicStatus.Muted;
    }
  }

  announce() {
    realtime.send({ type: ClientEventType.Mic_Set, muted: this.localMuted });
  }

  // Others default to hearing us, so only a standing deafen needs sending on join.
  announceDeafen() {
    if (this.deafened) realtime.send({ type: ClientEventType.Deafen_Set, deafened: true });
  }

  async toggle() {
    const enabling = this.status !== MicStatus.Enabled;
    if (!this.core.inCall) {
      this.status = enabling ? MicStatus.Enabled : MicStatus.Muted;
      if (enabling && this.deafened) this.setDeafened(false);
      this.mutedByDeafen = false;
      return;
    }
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
    if (!this.core.inCall) {
      // No track to toggle yet, so mirror the deafen-implies-mute intent by hand.
      if (next) {
        this.mutedByDeafen = this.status === MicStatus.Enabled;
        if (this.mutedByDeafen) this.status = MicStatus.Muted;
      } else if (this.mutedByDeafen) {
        this.mutedByDeafen = false;
        this.status = MicStatus.Enabled;
      }
      return;
    }
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
    if (this.core.inCall) realtime.send({ type: ClientEventType.Deafen_Set, deafened: value });
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
    // Carry a deliberate mute into the next call, but drop call-only states and
    // any mute that only existed because we were deafened.
    if (this.status === MicStatus.MutedByMod) {
      this.status = this.selfMutedBeforeMod ? MicStatus.Muted : MicStatus.Enabled;
    } else if (this.status === MicStatus.NotAllowed || this.mutedByDeafen) {
      this.status = MicStatus.Enabled;
    }
    this.resetKeepingStatus();
  }
}
