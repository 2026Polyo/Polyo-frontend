import { describe, expect, it } from "vitest";
import {
  CAT_PAW_LIFETIME_MS,
  CAT_SLAM_LIFETIME_MS,
  getClearEffectDurationMs,
  JELLY_EFFECT_LIFETIME_MS,
  MINECRAFT_EFFECT_LIFETIME_MS,
  NEON_HOLE_LIFETIME_MS,
  PIXEL_EFFECT_LIFETIME_MS,
} from "../themes";

describe("getClearEffectDurationMs", () => {
  it("returns 0 when nothing was cleared", () => {
    for (const effects of ["classic", "pixel", "jelly", "minecraft", "cat"] as const) {
      expect(getClearEffectDurationMs(effects, 0, 0)).toBe(0);
    }
  });

  it("classic theme has no board clear effect", () => {
    expect(getClearEffectDurationMs("classic", 8, 1)).toBe(0);
    expect(getClearEffectDurationMs("classic", 24, 3)).toBe(0);
  });

  it("uses the bigger neon black hole and cat slam effects for 3+ lines", () => {
    expect(getClearEffectDurationMs("pixel", 8, 1)).toBe(PIXEL_EFFECT_LIFETIME_MS);
    expect(getClearEffectDurationMs("pixel", 16, 2)).toBe(PIXEL_EFFECT_LIFETIME_MS);
    expect(getClearEffectDurationMs("pixel", 24, 3)).toBe(NEON_HOLE_LIFETIME_MS);
    expect(getClearEffectDurationMs("cat", 8, 1)).toBe(CAT_PAW_LIFETIME_MS);
    expect(getClearEffectDurationMs("cat", 24, 3)).toBe(CAT_SLAM_LIFETIME_MS);
  });

  it("jelly and minecraft use one length regardless of lines", () => {
    expect(getClearEffectDurationMs("jelly", 8, 1)).toBe(JELLY_EFFECT_LIFETIME_MS);
    expect(getClearEffectDurationMs("jelly", 32, 4)).toBe(JELLY_EFFECT_LIFETIME_MS);
    expect(getClearEffectDurationMs("minecraft", 8, 1)).toBe(MINECRAFT_EFFECT_LIFETIME_MS);
    expect(getClearEffectDurationMs("minecraft", 32, 4)).toBe(MINECRAFT_EFFECT_LIFETIME_MS);
  });

  it("special clears without full lines still wait for the effect", () => {
    // 폭탄 등으로 줄 없이 칸만 지워져도 테마 제거 연출은 재생된다.
    expect(getClearEffectDurationMs("jelly", 5, 0)).toBe(JELLY_EFFECT_LIFETIME_MS);
    expect(getClearEffectDurationMs("pixel", 5, 0)).toBe(PIXEL_EFFECT_LIFETIME_MS);
  });
});
