import { createNeonSound, type NeonSoundPreset } from "./neonSound";
import type { MinecraftSoundFamily, MinecraftSoundPreset } from "./minecraftSound";

export type ThemeSynthPreset = NeonSoundPreset | MinecraftSoundPreset
  | "jelly-placement" | "jelly-clear" | "cat-placement" | "cat-clear";

const CAT_LENGTHS = [0.32, 0.43, 0.36, 0.5, 0.29, 0.4];
const MATERIAL = {
  stone: [170, 1250, 0.75], metal: [230, 1550, 0.72], slime: [140, 650, 0.08],
  coral: [200, 1850, 0.8], nylium: [105, 850, 0.72], nether_wart: [125, 580, 0.48],
  cherry_wood: [310, 1600, 0.35], moss_block: [120, 500, 0.82], glass: [170, 1250, 0.75],
  amethyst_block: [880, 2300, 0.08], grass: [180, 1100, 0.85], cloth: [110, 380, 0.9],
} satisfies Record<MinecraftSoundFamily, number[]>;

function variantIndex(value: number) { return Number.isFinite(value) ? Math.abs(Math.trunc(value)) % 6 : 0; }

export function getThemeSoundDuration(preset: ThemeSynthPreset, variant = 0): number {
  if (preset === "neon-placement") return 0.16;
  if (preset === "neon-clear") return 1.12;
  if (preset === "cat-placement") return CAT_LENGTHS[variantIndex(variant)];
  if (preset === "cat-clear") return 0.34;
  if (preset === "jelly-placement") return 0.23;
  if (preset === "jelly-clear") return 0.34;
  if (preset === "mc-pickup") return 0.13;
  if (preset.endsWith("-hit")) return 0.08;
  if (preset.startsWith("mc-amethyst_block")) return 0.32;
  return preset.endsWith("-break") ? 0.24 : 0.18;
}

/** Original PCM authored for this game, not recordings copied from Minecraft. */
export function createThemeSound(preset: ThemeSynthPreset, sampleRate: number, variant = 0): Float32Array {
  if (preset === "neon-placement" || preset === "neon-clear") return createNeonSound(preset, sampleRate);
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError("Unsupported audio sample rate");
  const v = variantIndex(variant);
  const duration = getThemeSoundDuration(preset, v);
  const samples = new Float32Array(Math.ceil(sampleRate * duration));
  let seed = 0x6a656c6c ^ (v * 2654435761);
  for (const char of preset) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  let phase = 0, low = 0;
  const mc = /^mc-(.+)-(place|hit|break)$/.exec(preset);
  const family = mc?.[1] as MinecraftSoundFamily;
  const profile = mc ? MATERIAL[family] : null;
  if (mc && !profile) throw new RangeError("Unknown Minecraft sound family");
  const noiseAlpha = 1 - Math.exp(-2 * Math.PI * (profile?.[1] ?? 800) / sampleRate);
  const catWeights = new Float64Array(10);
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate, p = t / duration;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const noise = (seed >>> 0) / 0xffffffff * 2 - 1;
    const edge = Math.min(1, t / 0.006, (duration - t) / 0.035);
    let value = 0;
    if (preset === "cat-placement") {
      // Gentle voiced m-ee-ow: changing formants, contour and duration for six takes.
      const base = [370, 310, 430, 340, 480, 395][v];
      const contour = Math.sin(Math.PI * p) * [110, 150, 65, 115, 55, 90][v] - p * 90;
      phase += 2 * Math.PI * (base + contour + 7 * Math.sin(2 * Math.PI * 7 * t)) / sampleRate;
      const f1 = 450 + Math.sin(Math.PI * p) * 420, f2 = 1900 - p * 900;
      // Update slow vowel weights at control rate; no per-sample allocations.
      if (i % 16 === 0) {
        for (let harmonic = 1; harmonic <= 10; harmonic++) {
          const frequency = harmonic * (base + contour);
          catWeights[harmonic - 1] = frequency > sampleRate * 0.45 ? 0
            : (0.06 + 0.32 * Math.exp(-(((frequency - f1) / 400) ** 2))
              + 0.17 * Math.exp(-(((frequency - f2) / 500) ** 2))) / Math.sqrt(harmonic);
        }
      }
      const cosine = 2 * Math.cos(phase);
      let previous = 0, current = Math.sin(phase);
      for (const weight of catWeights) {
        value += current * weight;
        const next = cosine * current - previous;
        previous = current; current = next;
      }
      value *= Math.sin(Math.PI * p) ** 0.7 * 0.9;
    } else if (preset === "cat-clear") {
      phase += 2 * Math.PI * (310 + v * 16 - p * 110) / sampleRate;
      low += (noise - low) * 0.025;
      value = (Math.sin(phase) * 0.36 + Math.sin(phase * 1.5) * 0.08 + low * 0.12) * Math.sin(Math.PI * p) ** 1.4;
    } else if (preset === "jelly-placement" || preset === "jelly-clear") {
      const clear = preset === "jelly-clear";
      // Put the elastic body in the audible mids, with a small damped wobble.
      const wobble = 24 * Math.sin(2 * Math.PI * 20 * t) * Math.exp(-t * 15);
      phase += 2 * Math.PI * ((clear ? 330 : 310) + v * 11
        + (clear ? 180 : 210) * Math.exp(-t * 22) + wobble) / sampleRate;
      low += (noise - low) * noiseAlpha;
      const bounce = Math.sin(phase) * 0.38;
      const skin = Math.sin(phase * 2.08) * 0.19 * Math.exp(-t * 5);
      const pop = Math.sin(2 * Math.PI * (1100 * t - 250 * t * t)) * 0.13 * Math.exp(-t * 22);
      const swipe = clear ? low * 0.035 * Math.exp(-t * 40) : 0;
      value = (bounce + skin + pop + swipe) * Math.exp(-t * (clear ? 10 : 14));
    } else if (preset === "mc-pickup") {
      phase += 2 * Math.PI * (470 + 1550 * Math.exp(-t * 36)) / sampleRate;
      value = (Math.sin(phase) * 0.55 + Math.sin(phase * 1.98) * 0.08) * Math.exp(-t * 34);
    } else if (profile && mc) {
      const [base, , roughness] = profile;
      const breaking = mc[2] === "break", hit = mc[2] === "hit";
      const frequency = base * (1 + v * 0.04) * (family === "slime" ? 0.6 + 1.1 * Math.exp(-t * 24) : 1);
      phase += 2 * Math.PI * frequency / sampleRate;
      low += (noise - low) * noiseAlpha;
      const chips = breaking ? 0.5 + 0.5 * Math.cos(2 * Math.PI * 27 * t) ** 2 : 1;
      value = low * roughness * 1.7 * chips + Math.sin(phase) * (1 - roughness) * 0.55;
      if (family === "cherry_wood") value += Math.sin(phase * 2.23) * 0.17;
      if (family === "amethyst_block") value += Math.sin(phase * 1.5) * 0.16 + Math.sin(phase * 2.51) * 0.1;
      if (family === "glass" && breaking) value += (Math.sin(phase * 13.3) + Math.sin(phase * 17.9)) * 0.11;
      value *= Math.exp(-t * (hit ? 40 : breaking ? 20 : 30));
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
