import type { ThemeSoundCue, ThemeSoundEvent } from "./gameThemes";
import { createVisualRandom, type FeedbackCell } from "./boardFeedback";
import { createThemeSound, createSoundVariantPicker, type ThemeSynthPreset } from "./themeSoundSynthesis";
import { createMinecraftClearSoundPlan, getMinecraftSoundFamily, MINECRAFT_SOUND_FAMILIES } from "./minecraftSound";

export interface ThemeAudioDetails { color?: string; cells?: readonly FeedbackCell[] }
export interface ThemeAudioPlayer {
  resume: () => void;
  play: (event: ThemeSoundEvent, cleared?: number, details?: ThemeAudioDetails) => void;
  dispose: () => void;
}
interface SoundNote { key: string; delay: number; gain: number; rate: number }
const MAX_PENDING_AGE_MS = 250;

/** Own buffers, variation bags and scheduled voices per player; never shared across opponents. */
export function createThemeAudioPlayer(
  context: AudioContext,
  cues: Readonly<Record<ThemeSoundEvent, ThemeSoundCue | null>>,
  random: () => number = createVisualRandom(),
): ThemeAudioPlayer {
  let disposed = false, resuming = false;
  const buffers = new Map<string, AudioBuffer>();
  const groups = { placement: new Set<Set<AudioBufferSourceNode>>(), clear: new Set<Set<AudioBufferSourceNode>>() };
  const pending = new Map<ThemeSoundEvent, { requestedAt: number; cleared: number; details?: ThemeAudioDetails }>();
  const pick = createSoundVariantPicker(random);
  const variantCount = (cue: ThemeSoundCue) => cue.kind === "synth" ? Math.max(1, Math.min(6, cue.variants ?? 1)) : 2;
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
    else if (cue.kind === "minecraft") {
      for (const family of MINECRAFT_SOUND_FAMILIES) {
        if (event === "placement") prepare(`mc-${family}-place`, 2);
        else { prepare(`mc-${family}-hit`, 2); prepare(`mc-${family}-break`, 2); }
      }
      if (event === "clear") prepare("mc-pickup", 2);
    } else {
      void fetch(cue.src).then(response => {
        if (!response.ok) throw new Error("Audio unavailable");
        return response.arrayBuffer();
      }).then(bytes => context.decodeAudioData(bytes)).then(buffer => {
        if (!disposed) buffers.set(`file-${event}`, buffer);
      }).catch(() => undefined);
    }
  }

  function notesFor(event: ThemeSoundEvent, cleared: number, details?: ThemeAudioDetails): SoundNote[] {
    const cue = cues[event]; if (!cue) return [];
    const rate = event === "clear" && cue.kind === "synth" && cue.preset === "neon-clear"
      ? 1 + Math.min(cleared - 1, 3) * 0.025 : 1;
    if (cue.kind === "file") return [{ key: `file-${event}`, delay: 0, gain: 1, rate }];
    if (cue.kind === "synth") {
      return [{ key: synthKey(cue.preset, pick(cue.preset, variantCount(cue))), delay: 0, gain: 1, rate }];
    }
    if (event === "placement") {
      const preset = `mc-${getMinecraftSoundFamily(details?.color)}-place` as const;
      return [{ key: synthKey(preset, pick(preset, 2)), delay: 0, gain: 1, rate: 1 }];
    }
    const cells = details?.cells ?? [{ row: 0, col: 0, color: details?.color ?? "cyan" }];
    return createMinecraftClearSoundPlan(cells).map(note => ({
      key: synthKey(note.preset, pick(note.preset, 2)), delay: note.delay, gain: note.gain, rate: 1,
    }));
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
    const limit = event === "placement" ? 2 : cue.kind === "minecraft" ? 2 : 1;
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
  function resume() {
    if (disposed || resuming || context.state !== "suspended") return;
    resuming = true;
    void context.resume().then(() => {
      if (disposed) return;
      for (const [event, request] of pending) {
        if (performance.now() - request.requestedAt <= MAX_PENDING_AGE_MS) start(event, request.cleared, request.details);
      }
    }).catch(() => undefined).finally(() => { pending.clear(); resuming = false; });
  }
  function play(event: ThemeSoundEvent, cleared = 1, details?: ThemeAudioDetails) {
    if (disposed || context.state === "closed" || !cues[event]) return;
    if (event === "clear" && (!Number.isInteger(cleared) || cleared <= 0)) return;
    if (context.state === "running") start(event, cleared, details);
    else if (context.state === "suspended") {
      pending.set(event, { requestedAt: performance.now(), cleared,
        details: details ? { color: details.color, cells: details.cells?.slice(0, 64).map(cell => ({ ...cell })) } : undefined });
      resume();
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true; pending.clear();
    for (const active of Object.values(groups)) { for (const group of active) stopGroup(group); active.clear(); }
    buffers.clear();
  }
  return { resume, play, dispose };
}
