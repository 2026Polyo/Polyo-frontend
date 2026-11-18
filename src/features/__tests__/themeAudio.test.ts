import { afterEach, describe, expect, it, vi } from "vitest";
import { createNeonSound, NEON_SOUND_DURATION } from "../themes/neonSound";
import { createThemeAudioPlayer } from "../themes/themeAudio";
import { NEON_THEME } from "../themes/gameThemes";

function fakeContext(state: AudioContextState = "running") {
  const sources: ReturnType<typeof makeSource>[] = [];
  function makeSource() {
    return { buffer: null, playbackRate: { value: 1 }, connect: vi.fn(), disconnect: vi.fn(),
      start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null };
  }
  const context = {
    sampleRate: 8000, state, destination: {},
    createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
    createBufferSource: () => { const source = makeSource(); sources.push(source); return source; },
    createGain: () => ({ gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() }),
    resume: vi.fn(async () => { context.state = "running"; }),
  };
  return { context, ctx: context as unknown as AudioContext, sources };
}

afterEach(() => vi.restoreAllMocks());

describe("original neon PCM", () => {
  it("renders repeatable, finite, click-free cues at supported device rates without gameplay randomness", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => { throw Error("Gameplay random consumed"); });
    for (const rate of [8000, 44100, 48000, 96000]) {
      for (const preset of ["neon-placement", "neon-clear"] as const) {
        const samples = createNeonSound(preset, rate);
        expect(samples.length).toBe(Math.ceil(NEON_SOUND_DURATION[preset] * rate));
        expect(samples).toEqual(createNeonSound(preset, rate));
        let peak = 0, energy = 0;
        for (const sample of samples) {
          expect(Number.isFinite(sample)).toBe(true);
          peak = Math.max(peak, Math.abs(sample)); energy += sample ** 2;
        }
        expect(peak).toBeLessThan(0.7);
        expect(Math.sqrt(energy / samples.length)).toBeGreaterThan(0.02);
        expect(samples[0]).toBe(0);
        expect(Math.abs(samples[samples.length - 1])).toBeLessThan(0.001);
      }
    }
    expect(random).not.toHaveBeenCalled();
  });
  it("rejects invalid sample rates instead of allocating unbounded buffers", () => {
    for (const rate of [0, -1, NaN, Infinity, 384000]) expect(() => createNeonSound("neon-clear", rate)).toThrow(RangeError);
  });
});

describe("player-scoped theme audio", () => {
  it("limits rapid placements and replaces an already playing clear", () => {
    const { ctx, sources } = fakeContext();
    const player = createThemeAudioPlayer(ctx, NEON_THEME.sounds);
    for (let i = 0; i < 8; i++) player.play("placement");
    expect(sources.filter(s => !s.stop.mock.calls.length)).toHaveLength(2);
    player.play("clear", 1); player.play("clear", 4);
    expect(sources[8].stop).toHaveBeenCalledOnce();
    expect(sources[9].playbackRate.value).toBeCloseTo(1.075);
    player.dispose(); player.dispose(); player.play("placement");
    expect(sources).toHaveLength(10);
    expect(sources.every(s => s.stop.mock.calls.length)).toBe(true);
  });
  it("does not play zero/invalid clears and keeps separate players independent", () => {
    const first = fakeContext(), second = fakeContext();
    const a = createThemeAudioPlayer(first.ctx, NEON_THEME.sounds);
    const b = createThemeAudioPlayer(second.ctx, NEON_THEME.sounds);
    for (const count of [0, -1, NaN, Infinity, 0.5]) a.play("clear", count);
    expect(first.sources).toHaveLength(0);
    a.play("clear", 1); b.play("clear", 1); a.dispose();
    expect(first.sources[0].stop).toHaveBeenCalledOnce();
    expect(second.sources[0].stop).not.toHaveBeenCalled();
    second.sources[0].onended?.();
    expect(second.sources[0].disconnect).toHaveBeenCalledOnce();
    b.dispose();
  });
  it("coalesces suspended requests and never replays stale actions on resume", async () => {
    const { ctx, context, sources } = fakeContext("suspended");
    let finish!: () => void;
    context.resume.mockImplementation(() => new Promise(resolve => { finish = () => { context.state = "running"; resolve(); }; }));
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    const player = createThemeAudioPlayer(ctx, NEON_THEME.sounds);
    player.play("placement"); player.play("placement"); player.play("clear", 1);
    expect(context.resume).toHaveBeenCalledOnce();
    now.mockReturnValue(500); finish();
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(sources).toHaveLength(0);
    player.play("placement"); expect(sources).toHaveLength(1);
    player.dispose();
  });
  it("plays the first gesture after prompt resume and discards it after disposal", async () => {
    for (const dispose of [false, true]) {
      const { ctx, sources } = fakeContext("suspended");
      const player = createThemeAudioPlayer(ctx, NEON_THEME.sounds);
      player.play("placement"); if (dispose) player.dispose();
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
      expect(sources).toHaveLength(dispose ? 0 : 1);
      player.dispose();
    }
  });
  it("tolerates blocked playback, missing files and pending themes", async () => {
    const failed = fakeContext("suspended");
    failed.context.resume.mockRejectedValue(Error("Gesture required"));
    const player = createThemeAudioPlayer(failed.ctx, NEON_THEME.sounds);
    player.play("placement");
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(failed.sources).toHaveLength(0); player.dispose();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Error("Offline")));
    try {
      const { ctx, sources } = fakeContext();
      const files = createThemeAudioPlayer(ctx, { placement: { kind: "file", src: "/missing.wav", volume: 0.3 }, clear: null });
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
      files.play("placement"); files.play("clear", 1); files.dispose();
      expect(sources).toHaveLength(0);
    } finally { vi.unstubAllGlobals(); }
  });
});
