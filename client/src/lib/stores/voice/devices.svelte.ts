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
      const room = this.core.room;
      this.state.inputs = await Room.getLocalDevices("audioinput");
      // In a call the room is authoritative; before joining, keep the id the user
      // picked so re-enumerating (mount, hotplug) doesn't reset it to default.
      if (room) this.state.inputId = room.getActiveDevice("audioinput") ?? this.state.inputId;
      if (supportsAudioOutput()) {
        this.state.outputs = await Room.getLocalDevices("audiooutput");
        if (room) this.state.outputId = room.getActiveDevice("audiooutput") ?? this.state.outputId;
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
    // Remember the choice even before joining; join reads it into the room.
    this.state.inputId = deviceId;
    const room = this.core.room;
    if (!room) return;
    try {
      await room.switchActiveDevice("audioinput", deviceId);
    } catch (e) {
      this.core.error = `Couldn't switch microphone (${errorName(e)}).`;
    }
  }

  async setOutput(deviceId: string) {
    this.state.outputId = deviceId;
    const room = this.core.room;
    if (!room) return;
    try {
      await room.switchActiveDevice("audiooutput", deviceId);
    } catch (e) {
      this.core.error = `Couldn't switch speaker (${errorName(e)}).`;
    }
  }
}
