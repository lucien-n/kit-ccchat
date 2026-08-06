import { api } from "$lib/api";
import { apiErrorMessage } from "$lib/forms";
import { fileToDataUrl } from "$lib/image";
import {
  MAX_SOUNDBOARD_BYTES,
  MAX_SOUNDBOARD_DURATION_MS,
  MAX_SOUNDBOARD_NAME,
  type Sound,
} from "@motus/shared";
import { SvelteSet } from "svelte/reactivity";
import { voice } from "../voice.svelte";

const FAVORITES_KEY = "soundboardFavorites";
const VOLUME_KEY = "soundboardVolume";

export function nameFromFile(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .slice(0, MAX_SOUNDBOARD_NAME);
}

/** Duration lives only in the decoded audio, so the client measures it before
 *  upload. The server would have to decode the whole clip to check. */
async function durationOf(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  try {
    const el = new Audio();
    el.src = url;
    await new Promise<void>((resolve, reject) => {
      el.onloadedmetadata = () => resolve();
      el.onerror = () => reject(new Error("could not read audio"));
    });
    return Math.round((el.duration || 0) * 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

class SoundboardStore {
  sounds = $state<Sound[]>([]);
  loading = $state(false);
  error = $state("");
  /** An upload or edit is in flight; the dialog is only ever in one at a time. */
  busy = $state(false);
  /** Starred ids, persisted per-browser in localStorage rather than server-side. */
  favorites = new SvelteSet<string>();
  /** Listening volume for soundboard clips (0..1), per-device, not synced. */
  volume = $state(1);

  init() {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) for (const id of JSON.parse(raw) as string[]) this.favorites.add(id);
    } catch {
      /* corrupt value - start with no favorites */
    }
    const raw = localStorage.getItem(VOLUME_KEY);
    const stored = raw === null ? NaN : Number(raw);
    if (Number.isFinite(stored)) this.volume = Math.min(1, Math.max(0, stored));
    voice.applySoundboardVolume(this.volume);
  }

  setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume));
    voice.applySoundboardVolume(this.volume);
    try {
      localStorage.setItem(VOLUME_KEY, String(this.volume));
    } catch {
      /* storage full or blocked - volume is a nicety, never fatal */
    }
  }

  async load() {
    if (this.loading) return;
    this.loading = true;
    this.error = "";
    try {
      const { sounds } = await api.soundboard.list();
      this.sounds = sounds;
    } catch (e) {
      this.error = apiErrorMessage(e, "Couldn't load sounds.");
    } finally {
      this.loading = false;
    }
  }

  search(query: string): Sound[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.sounds;
    return this.sounds.filter((s) => s.name.toLowerCase().includes(q));
  }

  get favoriteSounds(): Sound[] {
    return this.sounds.filter((s) => this.favorites.has(s.id));
  }

  isFavorite(id: string): boolean {
    return this.favorites.has(id);
  }

  toggleFavorite(id: string) {
    if (this.favorites.has(id)) this.favorites.delete(id);
    else this.favorites.add(id);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...this.favorites]));
    } catch {
      /* storage full or blocked - favorite is a nicety, never fatal */
    }
  }

  async upload(file: File, name?: string, emoji?: string): Promise<Sound | null> {
    this.error = "";
    if (file.size > MAX_SOUNDBOARD_BYTES) {
      this.error = `Sound too large (max ${Math.round(MAX_SOUNDBOARD_BYTES / 1_000_000)}MB).`;
      return null;
    }

    this.busy = true;
    try {
      const durationMs = await durationOf(file);
      if (!durationMs) {
        this.error = "Couldn't read that audio file.";
        return null;
      }
      if (durationMs > MAX_SOUNDBOARD_DURATION_MS) {
        this.error = `Sound too long (max ${MAX_SOUNDBOARD_DURATION_MS / 1000}s).`;
        return null;
      }
      const sound = await fileToDataUrl(file);
      const res = await api.soundboard.upload({
        sound,
        name: name?.trim() || nameFromFile(file.name),
        emoji: emoji?.trim() || undefined,
        durationMs,
      });
      this.sounds = [res.sound, ...this.sounds];
      return res.sound;
    } catch (e) {
      this.error = apiErrorMessage(e, "Couldn't upload that sound.");
      return null;
    } finally {
      this.busy = false;
    }
  }

  async update(id: string, name: string, emoji?: string): Promise<Sound | null> {
    this.error = "";
    this.busy = true;
    try {
      const res = await api.soundboard.update(id, {
        name: name.trim(),
        emoji: emoji?.trim() || undefined,
      });
      this.sounds = this.sounds.map((s) => (s.id === id ? res.sound : s));
      return res.sound;
    } catch (e) {
      this.error = apiErrorMessage(e, "Couldn't save that sound.");
      return null;
    } finally {
      this.busy = false;
    }
  }

  async remove(id: string) {
    try {
      await api.soundboard.remove(id);
      this.sounds = this.sounds.filter((s) => s.id !== id);
      if (this.favorites.has(id)) this.toggleFavorite(id);
    } catch (e) {
      this.error = apiErrorMessage(e, "Couldn't delete that sound.");
    }
  }
}

export const soundboard = new SoundboardStore();
