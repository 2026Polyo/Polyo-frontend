import { describe, expect, it } from "vitest";
import {
  createNeonFractures,
  createNeonOrbit,
  NEON_HOLE_LIFETIME_MS,
} from "../themes/neonBlackHole";

describe("neon screen glass", () => {
  const seeded = (initial: number) => {
    let value = initial;
    return () => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
  };

  it("bounds geometry and keeps the fracture finite across seeds and extreme values", () => {
    const sources = [
      () => 0,
      () => 0.999999,
      ...Array.from({ length: 80 }, (_, i) => seeded(i)),
    ];
    for (const random of sources) {
      const glass = createNeonFractures(random);
      expect(
        glass.cracks.filter((crack) => crack.kind === "main"),
      ).toHaveLength(8);
      expect(glass.cracks.length).toBeLessThanOrEqual(24);
      expect(glass.shards).toHaveLength(16);
      expect(glass.facets.length).toBeLessThanOrEqual(8);
      expect(JSON.stringify(glass)).not.toMatch(/NaN|Infinity|null/);
      for (const crack of glass.cracks) {
        expect(crack.path).toMatch(/^M.* Z$/);
        expect(crack.highlight).not.toBe(crack.path);
        expect(crack.shadow).not.toBe(crack.path);
      }
      for (const chip of glass.shards) {
        expect(chip.duration + chip.delay).toBeLessThan(NEON_HOLE_LIFETIME_MS);
      }
    }
  });

  it("covers all four viewport edges and leaves the central area free at any aspect ratio", () => {
    for (const aspect of [0.25, 390 / 844, 1, 1160 / 1050, 2.4, 4]) {
      for (let seed = 0; seed < 24; seed++) {
        const glass = createNeonFractures(seeded(seed), aspect);
        const starts = glass.cracks
          .filter((crack) => crack.kind === "main")
          .map((crack) => crack.from);
        expect(starts.filter((p) => p.y < 0)).toHaveLength(2);
        expect(starts.filter((p) => p.x > glass.width)).toHaveLength(2);
        expect(starts.filter((p) => p.y > glass.height)).toHaveLength(2);
        expect(starts.filter((p) => p.x < 0)).toHaveLength(2);
        for (const crack of glass.cracks) {
          const points = [...crack.path.matchAll(/(-?\d+\.\d+),(-?\d+\.\d+)/g)];
          for (const point of points) {
            const x = Number(point[1]) / glass.width;
            const y = Number(point[2]) / glass.height;
            expect(x < 0.26 || x > 0.74 || y < 0.26 || y > 0.74).toBe(true);
          }
        }
      }
    }
  });

  it("uses irregular finite-width openings rather than uniform stroked lines", () => {
    const crack = createNeonFractures(seeded(41)).cracks[0];
    const points = [...crack.path.matchAll(/(-?\d+\.\d+),(-?\d+\.\d+)/g)].map(
      (match) => [Number(match[1]), Number(match[2])],
    );
    const widths = points.slice(0, points.length / 2).map((point, i) => {
      const opposite = points[points.length - 1 - i];
      return Math.hypot(point[0] - opposite[0], point[1] - opposite[1]);
    });
    expect(Math.min(...widths)).toBeGreaterThan(0);
    expect(Math.max(...widths)).toBeGreaterThan(Math.min(...widths) * 2);
  });

  it("is reproducible for capture while different seeds vary the entire fracture", () => {
    expect(createNeonFractures(seeded(12))).toEqual(
      createNeonFractures(seeded(12)),
    );
    expect(createNeonFractures(seeded(12))).not.toEqual(
      createNeonFractures(seeded(91)),
    );
  });
});

describe("neon black hole trajectories", () => {
  it("accelerates the inward turn while shrinking and finishes at the center", () => {
    const { frames, delay, duration } = createNeonOrbit(140, -90, () => 0.5);
    let previousRadius = Infinity;
    const angles: number[] = [];
    for (const frame of frames) {
      const transform = String(frame.transform);
      const translation = transform
        .match(/translate3d\(([^)]*)\)/)![1]
        .split(", ")
        .map(parseFloat);
      const radius = Math.hypot(translation[0] + 140, translation[1] - 90);
      expect(radius).toBeLessThanOrEqual(previousRadius + 0.000001);
      previousRadius = radius;
      angles.push(Number(transform.match(/rotateZ\(([-\d.]+)/)![1]));
      expect(transform).not.toMatch(/NaN|Infinity/);
    }
    expect(previousRadius).toBeLessThan(0.000001);
    expect(angles[24] - angles[23]).toBeGreaterThan(angles[1] - angles[0]);
    expect(frames[24].opacity).toBe(0);
    expect(delay + duration).toBeLessThan(NEON_HOLE_LIFETIME_MS);
  });

  it("handles a block at the center and varies each block's timing", () => {
    const slow = createNeonOrbit(0, 0, () => 0.99);
    const fast = createNeonOrbit(0, 0, () => 0);
    expect(slow.duration).toBeGreaterThan(fast.duration);
    expect(slow.delay).toBeGreaterThan(fast.delay);
    expect(JSON.stringify(slow.frames)).not.toMatch(/NaN|Infinity/);
  });
});
