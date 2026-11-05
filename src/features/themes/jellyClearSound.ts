import { JELLY_SLASH_MS, JELLY_BREAK_MS } from "./jellyFeedback";

export const JELLY_CLEAR_SOUND_END_MS = JELLY_BREAK_MS + 300;
const POP_OFFSETS = [0, 0.055, 0.12];
const POP_PITCHES = [520, 650, 450];
const POP_WEIGHTS = [1, 0.78, 0.62];

/** One short swipe followed by three soft fragments, aligned with the visual cut. */
export function createJellyClearSound(sampleRate: number, variant: number): Float32Array {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError("Unsupported audio sample rate");
  const samples = new Float32Array(Math.ceil(JELLY_CLEAR_SOUND_END_MS * sampleRate / 1000));
  const phases = new Float64Array(POP_OFFSETS.length);
  const fastAlpha = 1 - Math.exp(-2 * Math.PI * 2600 / sampleRate);
  const slowAlpha = 1 - Math.exp(-2 * Math.PI * 650 / sampleRate);
  let seed = 0x6a656c6c ^ ((variant + 1) * 2654435761);
  let fast = 0, slow = 0, peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    if (t < JELLY_SLASH_MS / 1000) continue;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const noise = (seed >>> 0) / 0xffffffff * 2 - 1;
    fast += (noise - fast) * fastAlpha;
    slow += (noise - slow) * slowAlpha;
    const swipeProgress = (t - JELLY_SLASH_MS / 1000) / 0.1;
    let value = swipeProgress < 1
      ? (fast - slow) * 0.3 * Math.sin(Math.PI * swipeProgress) ** 2 : 0;
    for (let pop = 0; pop < POP_OFFSETS.length; pop++) {
      const local = t - JELLY_BREAK_MS / 1000 - POP_OFFSETS[pop];
      if (local <= 0 || local >= 0.18) continue;
      const frequency = (POP_PITCHES[pop] + variant * 17) * (0.72 + 0.55 * Math.exp(-local * 25));
      phases[pop] += 2 * Math.PI * frequency / sampleRate;
      const body = Math.sin(phases[pop]) * 0.4 * Math.exp(-local * 27);
      const skin = Math.sin(phases[pop] * 2.12) * 0.16 * Math.exp(-local * 45);
      const edge = Math.min(1, local / 0.004, (0.18 - local) / 0.04);
      value += (body + skin) * POP_WEIGHTS[pop] * edge;
    }
    samples[i] = value; peak = Math.max(peak, Math.abs(value));
  }
  if (peak > 0.65) for (let i = 0; i < samples.length; i++) samples[i] *= 0.65 / peak;
  samples[0] = 0; samples[samples.length - 1] = 0;
  return samples;
}
