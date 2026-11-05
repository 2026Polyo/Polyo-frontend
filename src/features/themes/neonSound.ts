export type NeonSoundPreset = "neon-placement" | "neon-clear";

export const NEON_SOUND_DURATION = {
  "neon-placement": 0.16,
  "neon-clear": 1.12,
} as const;

/** Deterministic, original PCM. Never consumes gameplay randomness. */
export function createNeonSound(preset: NeonSoundPreset, sampleRate: number): Float32Array {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
    throw new RangeError("Unsupported audio sample rate");
  }
  const duration = NEON_SOUND_DURATION[preset];
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  let seed = 0x6e656f6e;
  let phase = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    const progress = t / duration;
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const noise = (seed >>> 0) / 0xffffffff * 2 - 1;
    // Smooth edges keep the digital texture without audible start/end clicks.
    const edge = Math.min(1, t / 0.004, (duration - t) / 0.035);
    let value: number;
    if (preset === "neon-placement") {
      phase += 2 * Math.PI * (240 + 560 * Math.exp(-t * 35)) / sampleRate;
      const chip = Math.tanh(Math.sin(phase) * 2.2);
      const sparkle = Math.sin(2 * Math.PI * 1660 * t) * Math.exp(-t * 65);
      value = (chip * 0.65 + sparkle * 0.2 + noise * 0.12) * Math.exp(-t * 28);
    } else {
      // Staggered chip grains soften into a descending, dissolving tail.
      const grain = Math.floor(t / 0.055);
      const local = (t % 0.055) / 0.055;
      const grainEnvelope = Math.sin(Math.PI * local) ** 2;
      const frequency = (950 - progress * 690) * [1, 1.25, 0.75, 1.5, 0.9][grain % 5];
      phase += 2 * Math.PI * frequency / sampleRate;
      const chip = Math.tanh(Math.sin(phase) * 1.8);
      const shimmer = Math.sin(2 * Math.PI * (1800 * t - 450 * t * t));
      value = (chip * grainEnvelope * 0.5 + shimmer * 0.14 + noise * grainEnvelope * 0.12)
        * (1 - progress) ** 1.4;
    }
    samples[i] = value * edge * 0.65;
  }
  return samples;
}
