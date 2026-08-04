import { errorName } from "$lib/forms";
import { Room } from "livekit-client";
import type { VoiceCore } from "./context";

const supportsAudioOutput = () =>
  typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

const empty = () => ({
  inputs: [] as MediaDeviceInfo[],
  inputId: "default",
  outputs: [] as MediaDeviceInfo[],
  outputId: "default",
});

export class DeviceController {
  state = $state(empty());

  constructor(private core: VoiceCore) {}

  async load() {
    try {
      this.state.inputs = await Room.getLocalDevices("audioinput");
      this.state.inputId = this.core.room?.getActiveDevice("audioinput") ?? "default";
      if (supportsAudioOutput()) {
        this.state.outputs = await Room.getLocalDevices("audiooutput");
        this.state.outputId = this.core.room?.getActiveDevice("audiooutput") ?? "default";
      }
    } catch {
      // ignore
    }
  }

  onActiveDeviceChanged(kind: MediaDeviceKind, deviceId: string) {
    if (kind === "audioinput") this.state.inputId = deviceId;
    else if (kind === "audiooutput") this.state.outputId = deviceId;
  }

  async setInput(deviceId: string) {
    const room = this.core.room;
    if (!room) return;
    try {
      await room.switchActiveDevice("audioinput", deviceId);
      this.state.inputId = deviceId;
    } catch (e) {
      this.core.error = `Couldn't switch microphone (${errorName(e)}).`;
    }
  }

  async setOutput(deviceId: string) {
    const room = this.core.room;
    if (!room) return;
    try {
      await room.switchActiveDevice("audiooutput", deviceId);
      this.state.outputId = deviceId;
    } catch (e) {
      this.core.error = `Couldn't switch speaker (${errorName(e)}).`;
    }
  }

  reset() {
    this.state = empty();
  }
}
