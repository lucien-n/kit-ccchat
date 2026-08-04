import type { VoiceMember } from "@ccchat/shared";

export type MuteState = "forced" | "self" | null;

/** Resolve a voice member's mute for display. A moderator mute (shown amber,
 *  not clearable by the member) outranks self-mute, and a live LiveKit reading
 *  of self-mute outranks the last presence snapshot. */
export function muteState(member: VoiceMember, liveMuted?: boolean): MuteState {
  if (member.forceMuted) return "forced";
  return (liveMuted ?? member.muted) ? "self" : null;
}
