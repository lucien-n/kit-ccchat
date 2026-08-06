import { SOUNDBOARD_MIME_TYPES } from "@motus/shared";
import { blobStore, decodeDataUrl, readBlobFile, type StoredBlob } from "./blob.js";

export function sniffAudioMime(buf: Buffer): string | null {
  const ascii = (start: number, len: number) =>
    buf.subarray(start, start + len).toString("ascii");
  if (ascii(0, 4) === "OggS") return "audio/ogg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE") return "audio/wav";
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3)
    return "audio/webm"; // EBML header
  if (ascii(0, 3) === "ID3") return "audio/mpeg";
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return "audio/mpeg"; // MPEG frame sync
  return null;
}

export type StoredSound = StoredBlob;

export function decodeSoundUpload(sound: string, maxBytes: number): Buffer {
  return decodeDataUrl(sound, {
    allowed: SOUNDBOARD_MIME_TYPES,
    maxBytes,
    sniff: sniffAudioMime,
    label: "sound",
  });
}

export const readSoundFile = (path: string): StoredSound | null =>
  readBlobFile(path, sniffAudioMime);

export const soundStore = (dir: string) => blobStore(dir, sniffAudioMime);
