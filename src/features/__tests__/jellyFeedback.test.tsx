import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ThemeScope } from "../../components/ThemeScope";
import PieceShape from "../../components/PieceShape";
import { colorClass } from "../../constants/gameData";
import { getGameTheme, getThemeSound } from "../themes/gameThemes";
import {
  createJellyEffectBatch,
  createJellyParticles,
  createJellySlashes,
  getJellyImpact,
  JELLY_BREAK_MS,
  JELLY_EFFECT_LIFETIME_MS,
  JELLY_SHARD_COUNT,
} from "../themes/jellyFeedback";
import type { FeedbackCell } from "../themes/boardFeedback";

const cell = (row: number, col: number): FeedbackCell => ({
  row,
  col,
  color: "cyan",
});

describe("jelly visual feedback", () => {
  it("cuts intersecting complete rows and columns once per line", () => {
    const cells = Array.from({ length: 8 }, (_, index) => [
      cell(3, index),
      cell(index, 5),
    ]).flat();
    expect(createJellySlashes(cells)).toEqual([
      { axis: "row", index: 3, start: 0, length: 8 },
      { axis: "col", index: 5, start: 0, length: 8 },
    ]);
  });

  it("cuts only affected partial segments for special clears, ignoring bad coordinates", () => {
    expect(
      createJellySlashes([
        cell(2, 1),
        cell(2, 2),
        cell(2, 2),
        cell(2, 4),
        cell(3, 4),
        cell(-1, 0),
        cell(99, 99),
        cell(NaN, 2),
      ]),
    ).toEqual([
      { axis: "row", index: 2, start: 1, length: 2 },
      { axis: "row", index: 2, start: 4, length: 1 },
      { axis: "row", index: 3, start: 4, length: 1 },
    ]);
  });

  it("keeps a sparse piece together inside its true bounds without changing feedback", () => {
    const feedback = {
      id: 7,
      placed: [cell(3, 4), cell(4, 4), cell(4, 5)],
      cleared: [],
    };
    const original = structuredClone(feedback);
    const batch = createJellyEffectBatch(feedback);
    expect(batch.bounds).toEqual({ row: 3, col: 4, rows: 2, cols: 2 });
    expect(batch.placed).toHaveLength(3);
    expect(batch.slashes).toEqual([]);
    batch.placed[0].color = "rose";
    expect(feedback).toEqual(original);
    expect(
      createJellyEffectBatch({ id: 8, placed: [], cleared: [] }).bounds,
    ).toBeNull();
  });

  it("varies droplets across all quadrants, sizes and distances", () => {
    let seed = 38;
    const random = () =>
      ((seed = (seed * 48271) % 2147483647) - 1) / 2147483646;
    const particles = Array.from({ length: 12 }, () =>
      createJellyParticles("drop", random),
    ).flat();
    expect(new Set(particles.map(({ x, y }) => `${x > 0},${y > 0}`)).size).toBe(
      4,
    );
    expect(new Set(particles.map(({ size }) => size)).size).toBeGreaterThan(20);
    for (const particle of particles) {
      expect(Math.hypot(particle.x, particle.y)).toBeGreaterThanOrEqual(
        22 - 1e-10,
      );
      expect(Math.hypot(particle.x, particle.y)).toBeLessThan(58);
      expect(particle.delay).toBeGreaterThanOrEqual(180);
      expect(particle.delay + particle.duration).toBeLessThan(
        JELLY_EFFECT_LIFETIME_MS,
      );
    }
  });

  it("shatters after the slash and finishes within its bounded lifetime", () => {
    const cells = Array.from({ length: 64 }, (_, index) =>
      cell(Math.floor(index / 8), index % 8),
    );
    const batch = createJellyEffectBatch({
      id: 1,
      placed: cells,
      cleared: cells,
    });
    const particles = [...batch.placed, ...batch.cleared].flatMap(
      (entry) => entry.particles,
    );
    expect(particles).toHaveLength(64 * 8);
    for (const particle of batch.cleared.flatMap((entry) => entry.particles)) {
      expect(particle.delay).toBeGreaterThanOrEqual(JELLY_BREAK_MS);
      expect(particle.delay + particle.duration).toBeLessThan(
        JELLY_EFFECT_LIFETIME_MS,
      );
    }
    expect(createJellyParticles("shard")).toHaveLength(JELLY_SHARD_COUNT);
    expect(batch.slashes).toHaveLength(16);
  });

  it("never consumes gameplay randomness", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw Error("Gameplay RNG consumed");
    });
    try {
      createJellyEffectBatch({
        id: 1,
        placed: [cell(0, 0)],
        cleared: [cell(0, 0)],
      });
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });

  it("creates uneven soft fragments without quarter-tile positions or a fixed outline", () => {
    let seed = 41;
    const random = () =>
      ((seed = (seed * 48271) % 2147483647) - 1) / 2147483646;
    const fragments = Array.from({ length: 12 }, () =>
      createJellyParticles("shard", random),
    ).flat();
    expect(new Set(fragments.map(({ size }) => size)).size).toBeGreaterThan(20);
    expect(new Set(fragments.map(({ shape }) => shape?.radius)).size).toBe(
      fragments.length,
    );
    for (const fragment of fragments) {
      expect(fragment.shape).toBeDefined();
      expect(fragment.shape!.height / fragment.size).toBeGreaterThanOrEqual(
        0.6,
      );
      expect(fragment.shape!.height / fragment.size).toBeLessThan(1.12);
      expect(fragment.shape!.radius).not.toBe(fragment.shape!.relaxedRadius);
      expect(fragment.shape!.left).not.toBe(0);
      expect(fragment.shape!.left).not.toBe(50);
    }
  });

  it("follows each slash direction and bounds the impulse at intersections", () => {
    const slashes = createJellySlashes(
      Array.from({ length: 8 }, (_, index) => [
        cell(3, index),
        cell(index, 5),
      ]).flat(),
    );
    expect(getJellyImpact(cell(3, 1), slashes)).toEqual({ x: 8, y: 0 });
    expect(getJellyImpact(cell(1, 5), slashes)).toEqual({ x: 0, y: 8 });
    expect(getJellyImpact(cell(1, 1), slashes)).toEqual({ x: 0, y: 0 });
    const intersection = getJellyImpact(cell(3, 5), slashes);
    expect(intersection.x).toBeGreaterThan(0);
    expect(intersection.y).toBeGreaterThan(0);
    expect(Math.hypot(intersection.x, intersection.y)).toBeCloseTo(8);
  });

  it("isolates jelly, neon and classic visuals and provides jelly audio", () => {
    const theme = getGameTheme("theme_jelly");
    for (const color of Object.keys(colorClass))
      expect(theme.palette[color]).toMatch(/^#[\da-f]{6}$/i);
    expect(theme.soundMode).toBe("custom");
    expect(getThemeSound(theme.id, "placement")?.kind).toBe("synth");
    expect(getThemeSound(theme.id, "clear")?.kind).toBe("synth");
    const piece = {
      id: "single",
      uid: "single",
      color: "cyan",
      cells: [[0, 0]] as [number, number][],
    };
    const markup = renderToStaticMarkup(
      <ThemeScope themeId="theme_jelly">
        <PieceShape piece={piece} />
        <ThemeScope themeId="theme_neon">
          <PieceShape piece={piece} />
        </ThemeScope>
        <ThemeScope themeId="theme_classic">
          <PieceShape piece={piece} />
        </ThemeScope>
        <PieceShape piece={piece} />
      </ThemeScope>,
    );
    expect(markup.match(/data-game-theme="theme_jelly"/g)).toHaveLength(2);
    expect(markup.match(/data-game-theme="theme_neon"/g)).toHaveLength(1);
    expect(markup.match(/data-game-theme="theme_classic"/g)).toHaveLength(1);
  });
});
