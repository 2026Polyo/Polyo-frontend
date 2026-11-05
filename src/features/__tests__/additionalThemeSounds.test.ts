import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeAudioContext } from "./audioTestContext";
import { CAT_THEME, JELLY_THEME, MINECRAFT_THEME } from "../themes/gameThemes";
import { MINECRAFT_MATERIALS } from "../themes/minecraftMaterials";
import { MINECRAFT_SOUND_PROFILES, MINECRAFT_SOUND_FAMILIES, getMinecraftSoundFamily, createMinecraftClearSoundPlan } from "../themes/minecraftSound";
import { createThemeSound, type ThemeSynthPreset } from "../themes/themeSoundSynthesis";
import { createThemeAudioPlayer } from "../themes/themeAudio";
import { preloadThemeFiles } from "../themes/themeFileAudio";
import { MINECRAFT_AUDIO_BANK } from "../../asset/sound/minecraft/bank";
import type { MinecraftOriginalBank } from "../themes/minecraftOriginalAudio";
import { createMinecraftEffectBatch, MINECRAFT_ITEM_END_MS, MINECRAFT_MINING_MS } from "../themes/minecraftFeedback";
import { JELLY_SLASH_MS, JELLY_BREAK_MS, JELLY_EFFECT_LIFETIME_MS } from "../themes/jellyFeedback";
import { JELLY_CLEAR_SOUND_END_MS } from "../themes/jellyClearSound";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function fakeMinecraftBank(ctx: AudioContext): MinecraftOriginalBank {
  return {
    buffers: new Map(MINECRAFT_AUDIO_BANK.files.map((_, index) => [index, ctx.createBuffer(1, 800, ctx.sampleRate)])),
    events: MINECRAFT_AUDIO_BANK.events,
  };
}

describe("material-aware Minecraft sound", () => {
  it("covers every authored block with its researched sound family", () => {
    expect(Object.keys(MINECRAFT_SOUND_PROFILES).sort()).toEqual(Object.keys(MINECRAFT_MATERIALS).sort());
    for (const [color, profile] of Object.entries(MINECRAFT_SOUND_PROFILES)) {
      expect(profile.blockId).toBe(MINECRAFT_MATERIALS[color].id);
      expect(MINECRAFT_SOUND_FAMILIES).toContain(profile.family);
    }
    expect(getMinecraftSoundFamily("amber")).toBe("coral");
    expect(getMinecraftSoundFamily("ghost")).toBe("glass");
    expect(getMinecraftSoundFamily("echo")).toBe("amethyst_block");
    for (const bad of [undefined, "missing", "__proto__"]) expect(getMinecraftSoundFamily(bad)).toBe("metal");
  });
  it("uses the visual wave's first material occurrence and a single collection cue", () => {
    const cells = [{ row: 1, col: 4, color: "echo" }, { row: 0, col: 2, color: "cyan" }, { row: 0, col: 3, color: "fill" }];
    const original = JSON.stringify(cells);
    const plan = createMinecraftClearSoundPlan(cells);
    const visual = createMinecraftEffectBatch({ id: 1, placed: [], cleared: cells }, () => 0.5);
    for (const family of ["metal", "amethyst_block"]) {
      const cell = visual.cleared.find(c => getMinecraftSoundFamily(c.color) === family)!;
      expect(plan.find(n => n.preset === `mc-${family}-break`)?.delay).toBeCloseTo((MINECRAFT_MINING_MS + cell.offset) / 1000);
    }
    expect(plan.filter(n => n.preset === "mc-pickup")).toHaveLength(1);
    expect(plan[plan.length - 1].delay).toBe(MINECRAFT_ITEM_END_MS / 1000);
    expect(JSON.stringify(cells)).toBe(original);
    expect(createMinecraftClearSoundPlan([])).toEqual([]);
  });
  it("bounds dense clears by material families and cancels scheduled pickups with their batch", async () => {
    const fake = fakeAudioContext();
    const player = createThemeAudioPlayer(fake.ctx, MINECRAFT_THEME.sounds, () => 0.4, async () => fakeMinecraftBank(fake.ctx));
    await player.ready;
    const colors = Object.keys(MINECRAFT_SOUND_PROFILES);
    const cells = Array.from({ length: 64 }, (_, i) => ({ row: Math.floor(i / 8), col: i % 8, color: colors[i % colors.length] }));
    const plan = createMinecraftClearSoundPlan(cells);
    expect(plan.length).toBeLessThanOrEqual(25);
    player.play("clear", 16, { cells });
    const first = fake.sources.slice();
    expect(first[first.length - 1].start).toHaveBeenCalledWith(3 + MINECRAFT_ITEM_END_MS / 1000);
    player.play("placement", 1, { color: "pink" });
    expect(first.every(s => !s.stop.mock.calls.length)).toBe(true);
    player.play("clear", 16, { cells });
    player.play("clear", 16, { cells });
    expect(first.every(s => s.stop.mock.calls.length === 1)).toBe(true);
    expect(fake.sources.filter(s => !s.stop.mock.calls.length).length).toBeLessThanOrEqual(plan.length * 2 + 1);
    player.dispose();
    expect(fake.sources.every(s => s.stop.mock.calls.length)).toBe(true);
  });
  it("routes each block to the correct original sample family and pitch", async () => {
    const { ctx, sources, gains } = fakeAudioContext();
    const bank = fakeMinecraftBank(ctx);
    const player = createThemeAudioPlayer(ctx, MINECRAFT_THEME.sounds, () => 0.4, async () => bank);
    await player.ready;
    const expected = {
      cyan: "dig/stone", lime: "mob/slime/big", amber: "dig/coral", rose: "block/nylium/break",
      violet: "dig/stone", blue: "dig/stone", teal: "block/netherwart/break", orange: "dig/stone",
      pink: "block/cherry_wood/break", green: "block/moss/break", indigo: "dig/stone",
      ghost: "dig/stone", line: "dig/stone", echo: "block/amethyst/place", golden: "dig/stone",
      bomb: "dig/grass", fill: "dig/stone", boost: "dig/cloth",
    };
    expect(Object.keys(expected).sort()).toEqual(Object.keys(MINECRAFT_MATERIALS).sort());
    for (const [color, path] of Object.entries(expected)) {
      player.play("placement", 1, { color });
      const source = sources[sources.length - 1];
      const index = [...bank.buffers].find(([, buffer]) => source.buffer === buffer)?.[0];
      expect(index).toBeDefined();
      expect(MINECRAFT_AUDIO_BANK.files[index!].id).toMatch(new RegExp(`^${path}[12]$`));
      expect(source.playbackRate.value).toBeCloseTo(["cyan", "golden", "fill"].includes(color) ? 1.2 : 0.8);
    }
    expect(gains[3].gain.value).toBeCloseTo(0.46 * 0.85);
    player.dispose();
  });

  it("plays only the latest fresh placement after loading, and drops disposed or failed requests", async () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(0);
    for (const scenario of ["ready", "stale", "disposed", "failed"]) {
      now.mockReturnValue(0);
      const { ctx, sources } = fakeAudioContext("suspended");
      const bank = fakeMinecraftBank(ctx);
      let complete!: () => void;
      const player = createThemeAudioPlayer(ctx, MINECRAFT_THEME.sounds, () => 0.4, () =>
        new Promise((resolve, reject) => {
          complete = () => scenario === "failed" ? reject(new Error("offline")) : resolve(bank);
        }));
      player.play("placement", 1, { color: "pink" });
      player.play("placement", 1, { color: "echo" });
      if (scenario === "disposed") player.dispose();
      if (scenario === "stale") now.mockReturnValue(500);
      complete();
      await player.ready;
      expect(sources).toHaveLength(scenario === "ready" ? 1 : 0);
      if (scenario === "ready") {
        const sample = bank.events["block.amethyst_block.place"][0];
        expect(sources[0].buffer).toBe(bank.buffers.get(sample.file));
      }
      player.dispose();
    }
  });
});

describe("restrained jelly and varied cat vocals", () => {
  it("produces valid, smoothly bounded PCM without consuming gameplay randomness", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => { throw Error("Gameplay random consumed"); });
    const presets: ThemeSynthPreset[] = ["jelly-placement", "jelly-clear", "cat-clear"];
    for (const rate of [8000, 48000]) {
      for (const preset of presets) {
        const pcm = createThemeSound(preset, rate, 1);
        let peak = 0, energy = 0;
        for (const sample of pcm) { if (!Number.isFinite(sample)) throw Error("Non-finite PCM"); peak = Math.max(peak, Math.abs(sample)); energy += sample * sample; }
        expect(peak).toBeLessThanOrEqual(0.651);
        expect(energy).toBeGreaterThan(0);
        expect(pcm[0]).toBe(0);
        expect(Math.abs(pcm[pcm.length - 1])).toBeLessThan(0.002);
      }
    }
    expect(random).not.toHaveBeenCalled();
    expect(() => createThemeSound("cat-clear", Infinity)).toThrow(RangeError);
  });
  it("loads one cat recording and shuffles five pitches without immediate repeats", async () => {
    const { ctx, sources } = fakeAudioContext();
    const cue = CAT_THEME.sounds.placement;
    if (cue?.kind !== "file" || !cue.playbackRates) throw Error("Cat pitch variants missing");
    const fetcher = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
    vi.stubGlobal("fetch", fetcher);
    const decode = vi.fn(async () => ctx.createBuffer(1, 800, ctx.sampleRate));
    Object.assign(ctx, { decodeAudioData: decode });
    const preload = preloadThemeFiles(ctx, cue);
    const player = createThemeAudioPlayer(ctx, CAT_THEME.sounds, () => 0.3);
    const recordings = await preload;
    await player.ready;
    expect(recordings).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(decode).toHaveBeenCalledOnce();
    const rates = new Set(cue.playbackRates);
    expect(rates.size).toBe(5);
    expect(rates.has(1)).toBe(true);
    for (let round = 0; round < 4; round++) {
      for (let i = 0; i < 5; i++) player.play("placement");
      const played = sources.slice(round * 5, round * 5 + 5);
      expect(new Set(played.map(source => source.playbackRate.value))).toEqual(rates);
    }
    for (let i = 1; i < sources.length; i++) {
      expect(sources[i].playbackRate.value).not.toBe(sources[i - 1].playbackRate.value);
    }
    expect(sources.every(source => source.buffer === recordings[0].buffer)).toBe(true);
    player.dispose();
  });
  it("can play remaining recordings in a file group if one file fails to load", async () => {
    const { ctx, sources } = fakeAudioContext();
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
    Object.assign(ctx, { decodeAudioData: async () => ctx.createBuffer(1, 800, ctx.sampleRate) });
    const player = createThemeAudioPlayer(ctx, {
      placement: { kind: "files", sources: ["missing.wav", "first.wav", "second.wav", "third.wav", "fourth.wav"], volume: 0.5 },
      clear: CAT_THEME.sounds.clear,
    }, () => 0.3);
    player.play("clear", 1);
    const clear = sources[0].buffer;
    await player.ready;
    for (let i = 0; i < 8; i++) player.play("placement");
    expect(new Set(sources.slice(1).map(source => source.buffer)).size).toBe(4);
    expect(sources.slice(1).every(source => source.buffer !== clear)).toBe(true);
    expect(sources[0].stop).not.toHaveBeenCalled();
    player.dispose();
  });
  it("keeps jelly short and low in noisy texture, with bounded gains and voice counts", () => {
    const { ctx, sources, gains } = fakeAudioContext();
    const player = createThemeAudioPlayer(ctx, JELLY_THEME.sounds, () => 0.3);
    for (let i = 0; i < 10; i++) player.play("placement");
    player.play("clear", 4);
    expect(sources.slice(0, 10).every(s => s.buffer!.duration <= 0.24)).toBe(true);
    expect(sources[10].buffer!.duration).toBe(JELLY_CLEAR_SOUND_END_MS / 1000);
    expect(gains.every(g => g.gain.value <= 0.52)).toBe(true);
    expect(sources.filter(s => !s.stop.mock.calls.length)).toHaveLength(3);
    player.dispose();
  });
  it("keeps every jelly variation audible above the weak-bass range at its actual playback gain", () => {
    for (const event of ["placement", "clear"] as const) {
      const cue = JELLY_THEME.sounds[event];
      if (cue?.kind !== "synth") throw Error("Jelly synthesis cue missing");
      for (let variant = 0; variant < (cue.variants ?? 1); variant++) {
        const pcm = createThemeSound(cue.preset, 48000, variant);
        const alpha = Math.exp(-2 * Math.PI * 450 / 48000);
        let energy = 0, highEnergy = 0, previous = 0, high = 0;
        const start = event === "clear" ? Math.floor(JELLY_SLASH_MS * 48) : 0;
        for (let i = start; i < pcm.length; i++) {
          const value = pcm[i] * cue.volume;
          high = alpha * (high + value - previous); previous = value;
          energy += value * value; highEnergy += high * high;
        }
        // Proxy for small-speaker audibility: preserve energy outside deep bass.
        expect(Math.sqrt(highEnergy / (pcm.length - start))).toBeGreaterThan(0.03);
        expect(highEnergy / energy).toBeGreaterThan(0.22);
      }
    }
  });
  it("aligns jelly's separate swipe and fragments with the visual removal", () => {
    const rate = 48000, pcm = createThemeSound("jelly-clear", rate);
    const rms = (from: number, to: number) => {
      const segment = pcm.slice(Math.floor(from * rate), Math.floor(to * rate));
      return Math.sqrt(segment.reduce((sum, sample) => sum + sample * sample, 0) / segment.length);
    };
    expect(rms(0, JELLY_SLASH_MS / 1000)).toBe(0);
    expect(rms(JELLY_SLASH_MS / 1000, JELLY_BREAK_MS / 1000)).toBeGreaterThan(0.01);
    expect(rms(JELLY_BREAK_MS / 1000, 0.64)).toBeGreaterThan(0.03);
    expect(JELLY_CLEAR_SOUND_END_MS).toBeLessThan(JELLY_EFFECT_LIFETIME_MS);
  });
  it("retains two jelly removals so rapid valid clears do not cancel the first before its slash", () => {
    const { ctx, sources } = fakeAudioContext();
    const player = createThemeAudioPlayer(ctx, JELLY_THEME.sounds, () => 0.3);
    player.play("clear", 1); player.play("clear", 1);
    expect(sources[0].stop).not.toHaveBeenCalled();
    player.play("clear", 1);
    expect(sources[0].stop).toHaveBeenCalledOnce();
    expect(sources.filter(s => !s.stop.mock.calls.length)).toHaveLength(2);
    player.dispose();
    expect(sources.every(s => s.stop.mock.calls.length)).toBe(true);
  });
});
