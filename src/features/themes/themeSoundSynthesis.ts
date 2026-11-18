import { createNeonSound, type NeonSoundPreset } from "./neonSound";
import { createJellyClearSound, JELLY_CLEAR_SOUND_END_MS } from "./jellyClearSound";

export type ThemeSynthPreset = NeonSoundPreset
  | "jelly-placement" | "jelly-clear" | "cat-clear";

function variantIndex(value: number) { return Number.isFinite(value) ? Math.abs(Math.trunc(value)) % 6 : 0; }

export function getThemeSoundDuration(preset: ThemeSynthPreset): number {
  if (preset === "neon-placement") return 0.16;
  if (preset === "neon-clear") return 1.12;
  if (preset === "cat-clear") return 0.34;
  if (preset === "jelly-clear") return JELLY_CLEAR_SOUND_END_MS / 1000;
  return 0.23;
}

/** Procedural PCM for the neon, jelly and cat themes. */
export function createThemeSound(preset: ThemeSynthPreset, sampleRate: number, variant = 0): Float32Array {
  if (preset === "neon-placement" || preset === "neon-clear") return createNeonSound(preset, sampleRate);
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError("Unsupported audio sample rate");
  const v = variantIndex(variant);
  if (preset === "jelly-clear") return createJellyClearSound(sampleRate, v);
  const duration = getThemeSoundDuration(preset);
  const samples = new Float32Array(Math.ceil(sampleRate * duration));
  let seed = 0x6a656c6c ^ (v * 2654435761);
  for (const char of preset) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  let phase = 0, low = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate, p = t / duration;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const noise = (seed >>> 0) / 0xffffffff * 2 - 1;
    const edge = Math.min(1, t / 0.006, (duration - t) / 0.035);
    let value = 0;
    if (preset === "cat-clear") {
      phase += 2 * Math.PI * (310 + v * 16 - p * 110) / sampleRate;
      low += (noise - low) * 0.025;
      value = (Math.sin(phase) * 0.36 + Math.sin(phase * 1.5) * 0.08 + low * 0.12) * Math.sin(Math.PI * p) ** 1.4;
    } else if (preset === "jelly-placement") {
      // Put the elastic body in the audible mids, with a small damped wobble.
      const wobble = 24 * Math.sin(2 * Math.PI * 20 * t) * Math.exp(-t * 15);
      phase += 2 * Math.PI * (310 + v * 11 + 210 * Math.exp(-t * 22) + wobble) / sampleRate;
      const bounce = Math.sin(phase) * 0.38;
      const skin = Math.sin(phase * 2.08) * 0.19 * Math.exp(-t * 5);
      const pop = Math.sin(2 * Math.PI * (1100 * t - 250 * t * t)) * 0.13 * Math.exp(-t * 22);
      value = (bounce + skin + pop) * Math.exp(-t * 14);
    }
    samples[i] = value * edge;
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  if (peak > 0.65) for (let i = 0; i < samples.length; i++) samples[i] *= 0.65 / peak;
  samples[0] = 0; samples[samples.length - 1] = 0;
  return samples;
}

/** Player-local shuffle bags: no immediate repeats, including across bag boundaries. */
export function createSoundVariantPicker(random: () => number) {
  const bags = new Map<string, { values: number[]; last: number }>();
  return (key: string, count: number): number => {
    let bag = bags.get(key);
    if (!bag) { bag = { values: [], last: -1 }; bags.set(key, bag); }
    if (!bag.values.length) {
      bag.values = Array.from({ length: Math.max(1, Math.min(6, Math.trunc(count))) }, (_, i) => i);
      for (let i = bag.values.length - 1; i > 0; i--) {
        const other = Math.floor(random() * (i + 1));
        [bag.values[i], bag.values[other]] = [bag.values[other], bag.values[i]];
      }
      const last = bag.values.length - 1;
      if (last > 0 && bag.values[last] === bag.last) [bag.values[0], bag.values[last]] = [bag.values[last], bag.values[0]];
    }
    bag.last = bag.values.pop()!;
    return bag.last;
  };
}
