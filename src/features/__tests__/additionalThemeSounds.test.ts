import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeAudioContext } from "./audioTestContext";
import { CAT_THEME, JELLY_THEME, MINECRAFT_THEME } from "../themes/gameThemes";
import { MINECRAFT_MATERIALS } from "../themes/minecraftMaterials";
import { MINECRAFT_SOUND_PROFILES, MINECRAFT_SOUND_FAMILIES, getMinecraftSoundFamily, createMinecraftClearSoundPlan } from "../themes/minecraftSound";
import { createThemeSound, createSoundVariantPicker, type ThemeSynthPreset } from "../themes/themeSoundSynthesis";
import { createThemeAudioPlayer } from "../themes/themeAudio";
import { createMinecraftEffectBatch, MINECRAFT_ITEM_END_MS, MINECRAFT_MINING_MS } from "../themes/minecraftFeedback";
import { JELLY_SLASH_MS, JELLY_BREAK_MS, JELLY_EFFECT_LIFETIME_MS } from "../themes/jellyFeedback";
import { JELLY_CLEAR_SOUND_END_MS } from "../themes/jellyClearSound";

afterEach(() => vi.restoreAllMocks());

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
  it("bounds dense clears by material families and cancels scheduled pickups with their batch", () => {
    const fake = fakeAudioContext();
    const player = createThemeAudioPlayer(fake.ctx, MINECRAFT_THEME.sounds, () => 0.4);
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
  it("selects a different buffer for stone, wood, slime, wool and amethyst placements", () => {
    const { ctx, sources } = fakeAudioContext();
    const player = createThemeAudioPlayer(ctx, MINECRAFT_THEME.sounds, () => 0.4);
    for (const color of ["blue", "pink", "lime", "boost", "echo"]) player.play("placement", 1, { color });
    expect(new Set(sources.map(s => s.buffer)).size).toBe(5);
    player.dispose();
  });
});

describe("restrained jelly and varied cat vocals", () => {
  it("produces valid, smoothly bounded PCM without consuming gameplay randomness", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => { throw Error("Gameplay random consumed"); });
    const presets: ThemeSynthPreset[] = ["jelly-placement", "jelly-clear", "cat-placement", "cat-clear", "mc-pickup",
      ...MINECRAFT_SOUND_FAMILIES.flatMap(family => [`mc-${family}-place`, `mc-${family}-hit`, `mc-${family}-break`] as ThemeSynthPreset[])];
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
    expect(() => createThemeSound("cat-placement", Infinity)).toThrow(RangeError);
  });
  it("plays six distinct cat takes and never repeats the previous take across shuffle bags", () => {
    const { ctx, sources } = fakeAudioContext();
    const player = createThemeAudioPlayer(ctx, CAT_THEME.sounds, () => 0.3);
    for (let i = 0; i < 30; i++) player.play("placement");
    expect(new Set(sources.slice(0, 6).map(s => s.buffer)).size).toBe(6);
    for (let i = 1; i < sources.length; i++) expect(sources[i].buffer).not.toBe(sources[i - 1].buffer);
    player.dispose();
    const a = createSoundVariantPicker(() => 0.2), b = createSoundVariantPicker(() => 0.2);
    expect(a("cat", 6)).toBe(b("cat", 6));
    a("cat", 6); a("cat", 6);
    expect(b("cat", 6)).not.toBeUndefined();
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
