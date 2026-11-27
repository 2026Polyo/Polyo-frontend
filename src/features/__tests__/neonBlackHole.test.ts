import { describe, expect, it } from "vitest";
import { createNeonOrbit, NEON_HOLE_LIFETIME_MS } from "../themes/neonBlackHole";

describe("neon black hole trajectories", () => {
  it("accelerates the inward turn while shrinking and finishes at the center", () => {
    const { frames, delay, duration } = createNeonOrbit(140, -90, () => 0.5);
    let previousRadius = Infinity;
    const angles: number[] = [];
    for (const frame of frames) {
      const transform = String(frame.transform);
      const translation = transform.match(/translate3d\(([^)]*)\)/)![1].split(", ").map(parseFloat);
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
