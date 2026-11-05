import type { ThemeSoundCue, ThemeSoundEvent } from "./gameThemes";
import { createVisualRandom, type FeedbackCell } from "./boardFeedback";
import { createThemeSound, createSoundVariantPicker, type ThemeSynthPreset } from "./themeSoundSynthesis";
import { createMinecraftClearSoundPlan, getMinecraftSoundFamily, type MinecraftSoundPreset } from "./minecraftSound";
import { preloadThemeFiles } from "./themeFileAudio";
import {
  getMinecraftOriginalEvent,
  preloadMinecraftOriginalAudio,
  type MinecraftAudioLoader,
  type MinecraftOriginalBank,
} from "./minecraftOriginalAudio";

export interface ThemeAudioDetails { color?: string; cells?: readonly FeedbackCell[] }
export interface ThemeAudioPlayer {
  ready?: Promise<void>;
  resume: () => void;
  play: (event: ThemeSoundEvent, cleared?: number, details?: ThemeAudioDetails) => void;
  dispose: () => void;
}
interface SoundNote { key: string; delay: number; gain: number; rate: number }
const MAX_PENDING_AGE_MS = 250;

/** Variation bags and scheduled voices belong to one player; decoded originals are read-only. */
export function createThemeAudioPlayer(
  context: AudioContext,
  cues: Readonly<Record<ThemeSoundEvent, ThemeSoundCue | null>>,
  random: () => number = createVisualRandom(),
  loadMinecraft: MinecraftAudioLoader = preloadMinecraftOriginalAudio,
): ThemeAudioPlayer {
  let disposed = false, resuming = false;
  const buffers = new Map<string, AudioBuffer>();
  const fileVariants = new Map<ThemeSoundEvent, string[]>();
  const loading = new Set<ThemeSoundEvent>();
  const loads: Promise<void>[] = [];
  let minecraft: MinecraftOriginalBank | undefined;
  const groups = { placement: new Set<Set<AudioBufferSourceNode>>(), clear: new Set<Set<AudioBufferSourceNode>>() };
  const pending = new Map<ThemeSoundEvent, { requestedAt: number; cleared: number; details?: ThemeAudioDetails }>();
  const pick = createSoundVariantPicker(random);
  const variantCount = (cue: Extract<ThemeSoundCue, { kind: "synth" }>) => Math.max(1, Math.min(6, cue.variants ?? 1));
  function synthKey(preset: ThemeSynthPreset, variant: number) { return `${preset}:${variant}`; }
  function prepare(preset: ThemeSynthPreset, count: number) {
    for (let variant = 0; variant < count; variant++) {
      const key = synthKey(preset, variant);
      if (buffers.has(key)) continue;
      const pcm = createThemeSound(preset, context.sampleRate, variant);
      const buffer = context.createBuffer(1, pcm.length, context.sampleRate);
      buffer.getChannelData(0).set(pcm); buffers.set(key, buffer);
    }
  }
  for (const event of ["placement", "clear"] as const) {
    const cue = cues[event]; if (!cue) continue;
    if (cue.kind === "synth") prepare(cue.preset, variantCount(cue));
    else if (cue.kind === "minecraft") loading.add(event);
    else {
      loading.add(event);
      loads.push(preloadThemeFiles(context, cue).then(files => {
        if (disposed) return;
        const keys = files.map(({ src, buffer }) => {
          const key = `file:${src}`;
          buffers.set(key, buffer);
          return key;
        });
        fileVariants.set(event, keys);
      }).finally(() => { loading.delete(event); flushPending(); }));
    }
  }

  function originalNote(preset: MinecraftSoundPreset, delay: number, gain: number): SoundNote[] {
    const { event, rate } = getMinecraftOriginalEvent(preset);
    const samples = minecraft?.events[event];
    if (!samples?.length) return [];
    const sample = samples[pick(event, samples.length)];
    return [{ key: `minecraft:${sample.file}`, delay, gain: gain * sample.volume, rate: rate * sample.pitch }];
  }

  function notesFor(event: ThemeSoundEvent, cleared: number, details?: ThemeAudioDetails): SoundNote[] {
    const cue = cues[event]; if (!cue) return [];
    const rate = event === "clear" && cue.kind === "synth" && cue.preset === "neon-clear"
      ? 1 + Math.min(cleared - 1, 3) * 0.025 : 1;
    if (cue.kind === "file" || cue.kind === "files") {
      const variants = fileVariants.get(event);
      if (!variants?.length) return [];
      if (cue.kind === "file") {
        const rates = cue.playbackRates;
        const playbackRate = rates?.length ? rates[pick(`file-rate-${event}`, rates.length)] : 1;
        return [{ key: variants[0], delay: 0, gain: 1, rate: playbackRate }];
      }
      const key = variants[pick(`file-${event}`, variants.length)];
      return [{ key, delay: 0, gain: 1, rate: cue.rate ?? 1 }];
    }
    if (cue.kind === "synth") {
      return [{ key: synthKey(cue.preset, pick(cue.preset, variantCount(cue))), delay: 0, gain: 1, rate }];
    }
    if (event === "placement") {
      return originalNote(`mc-${getMinecraftSoundFamily(details?.color)}-place`, 0, 1);
    }
    const cells = details?.cells ?? [{ row: 0, col: 0, color: details?.color ?? "cyan" }];
    return createMinecraftClearSoundPlan(cells).flatMap(note => originalNote(note.preset, note.delay, note.gain));
  }

  function stopGroup(group: Set<AudioBufferSourceNode>) {
    for (const source of group) source.stop();
    group.clear();
  }
  function start(event: ThemeSoundEvent, cleared: number, details?: ThemeAudioDetails) {
    const cue = cues[event];
    if (disposed || context.state !== "running" || !cue) return;
    const notes = notesFor(event, cleared, details).filter(note => buffers.has(note.key));
    if (!notes.length) return;
    const active = groups[event];
    const followsAnimation = cue.kind === "minecraft"
      || (cue.kind === "synth" && cue.preset === "jelly-clear");
    const limit = event === "placement" || followsAnimation ? 2 : 1;
    if (active.size >= limit) {
      const oldest = active.values().next().value!; stopGroup(oldest); active.delete(oldest);
    }
    const group = new Set<AudioBufferSourceNode>(); active.add(group);
    const now = context.currentTime || 0;
    const volume = Number.isFinite(cue.volume) ? Math.max(0, Math.min(1, cue.volume)) : 0;
    for (const note of notes) {
      const source = context.createBufferSource(), gain = context.createGain();
      source.buffer = buffers.get(note.key)!; source.playbackRate.value = note.rate;
      gain.gain.value = volume * note.gain;
      source.connect(gain); gain.connect(context.destination);
      source.onended = () => {
        group.delete(source); source.disconnect(); gain.disconnect();
        if (!group.size) active.delete(group);
      };
      group.add(source);
      // Web Audio owns the schedule; stopping a group also cancels future pickup notes.
      source.start(now + note.delay);
    }
  }
  function flushPending() {
    if (disposed || context.state !== "running") return;
    for (const [event, request] of pending) {
      const fresh = performance.now() - request.requestedAt <= MAX_PENDING_AGE_MS;
      if (fresh && loading.has(event)) continue;
      pending.delete(event);
      if (fresh) start(event, request.cleared, request.details);
    }
  }
  if (Object.values(cues).some(cue => cue?.kind === "minecraft")) {
    loads.push(loadMinecraft(context).then(bank => {
      if (disposed) return;
      minecraft = bank;
      for (const [index, buffer] of bank.buffers) buffers.set(`minecraft:${index}`, buffer);
    }).catch(() => {
      // Unavailable audio must not affect placement, clear or shared cues.
      for (const [event] of pending) if (cues[event]?.kind === "minecraft") pending.delete(event);
    }).then(() => {
      for (const event of loading) if (cues[event]?.kind === "minecraft") loading.delete(event);
      flushPending();
    }));
  }
  const ready = loads.length ? Promise.all(loads).then(() => undefined) : undefined;

  function resume() {
    if (disposed || resuming || context.state !== "suspended") return;
    resuming = true;
    void context.resume().then(flushPending).catch(() => pending.clear()).finally(() => { resuming = false; });
  }
  function play(event: ThemeSoundEvent, cleared = 1, details?: ThemeAudioDetails) {
    if (disposed || context.state === "closed" || !cues[event]) return;
    if (event === "clear" && (!Number.isInteger(cleared) || cleared <= 0)) return;
    if (context.state === "suspended" || loading.has(event)) {
      pending.set(event, { requestedAt: performance.now(), cleared,
        details: details ? { color: details.color, cells: details.cells?.slice(0, 64).map(cell => ({ ...cell })) } : undefined });
      resume();
    } else if (context.state === "running") start(event, cleared, details);
  }
  function dispose() {
    if (disposed) return;
    disposed = true; pending.clear();
    for (const active of Object.values(groups)) { for (const group of active) stopGroup(group); active.clear(); }
    buffers.clear(); fileVariants.clear(); minecraft = undefined;
  }
  return { ready, resume, play, dispose };
}
