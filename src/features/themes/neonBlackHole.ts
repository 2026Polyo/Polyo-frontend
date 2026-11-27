import { createVisualRandom } from "./boardFeedback";

export const NEON_HOLE_LIFETIME_MS = 2250;

type GlassPoint = { x: number; y: number };
const glassPoint = ({ x, y }: GlassPoint) => `${x.toFixed(3)},${y.toFixed(3)}`;
const glassPath = (points: GlassPoint[]) =>
  `M${points.map(glassPoint).join(" L")}`;

interface GlassCrack {
  path: string;
  shadow: string;
  highlight: string;
  from: GlassPoint;
  to: GlassPoint;
  kind: "main" | "branch";
}

function crackRibbon(
  points: GlassPoint[],
  width: number,
  random: () => number,
): GlassCrack {
  const left: GlassPoint[] = [];
  const right: GlassPoint[] = [];
  const inner: GlassPoint[] = [];
  const shadowLeft: GlassPoint[] = [];
  const shadowRight: GlassPoint[] = [];
  points.forEach((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const length = Math.hypot(next.x - previous.x, next.y - previous.y) || 1;
    const nx = -(next.y - previous.y) / length;
    const ny = (next.x - previous.x) / length;
    const progress = index / (points.length - 1);
    const opening = width * (0.4 + random() * 1.3) * (1 - progress * 0.72);
    const at = (distance: number, offset = 0): GlassPoint => ({
      x: point.x + nx * distance + offset,
      y: point.y + ny * distance + offset * 0.6,
    });
    left.push(at(opening));
    right.push(at(-opening * (0.45 + random() * 0.7)));
    inner.push(at(opening * 0.65));
    shadowLeft.push(at(opening * 1.7, 0.055));
    shadowRight.push(at(-opening * 1.7, 0.055));
  });
  const closed = (a: GlassPoint[], b: GlassPoint[]) =>
    `${glassPath([...a, ...[...b].reverse()])} Z`;
  return {
    path: closed(left, right),
    shadow: closed(shadowLeft, shadowRight),
    highlight: closed(left, inner),
    from: points[0],
    to: points[points.length - 1],
    kind: "main",
  };
}

function crackSpine(
  origin: GlassPoint,
  angle: number,
  reach: number,
  segments: number,
  random: () => number,
): GlassPoint[] {
  const steps = Array.from({ length: segments }, () => 0.45 + random() * 1.6);
  const total = steps.reduce((sum, step) => sum + step, 0);
  let travelled = 0;
  let bend = 0;
  const points = [origin];
  for (const step of steps) {
    travelled += step / total;
    const distance = travelled ** 1.25 * reach;
    bend = bend * 0.55 + (random() - 0.5) * 2.1;
    const sideways = bend * Math.min(1, distance / 6);
    points.push({
      x: origin.x + Math.cos(angle) * distance - Math.sin(angle) * sideways,
      y: origin.y + Math.sin(angle) * distance + Math.cos(angle) * sideways,
    });
  }
  return points;
}

/** Independent edge impacts leave the center clear; generated once in viewport proportions. */
export function createNeonFractures(
  random = createVisualRandom(),
  aspectRatio = 1,
) {
  const aspect =
    Number.isFinite(aspectRatio) && aspectRatio > 0
      ? Math.max(0.25, Math.min(4, aspectRatio))
      : 1;
  const width = aspect < 1 ? 100 * aspect : 100;
  const height = aspect < 1 ? 100 : 100 / aspect;
  const count = 8;
  const cracks: GlassCrack[] = [];
  const facets: { points: string; opacity: number }[] = [];
  const shards: {
    points: string;
    x: string;
    y: string;
    angle: string;
    duration: number;
    delay: number;
  }[] = [];
  for (let index = 0; index < count; index++) {
    const edge = Math.floor(index / 2);
    const span = edge % 2 === 0 ? width : height;
    const depth = edge % 2 === 0 ? height : width;
    const onEdge = ({ x: along, y: inward }: GlassPoint): GlassPoint => {
      const u = Math.max(0, Math.min(span, along));
      const v = Math.max(-0.65, Math.min(depth * 0.23, inward));
      switch (edge) {
        case 0:
          return { x: u, y: v };
        case 1:
          return { x: width - v, y: u };
        case 2:
          return { x: width - u, y: height - v };
        default:
          return { x: v, y: height - u };
      }
    };
    const origin = {
      x: span * ((index % 2 === 0 ? 0.2 : 0.72) + (random() - 0.5) * 0.2),
      y: -0.65,
    };
    const direction = Math.PI / 2 + (random() - 0.5) * 1.2;
    const local = crackSpine(
      origin,
      direction,
      depth * (0.13 + random() * 0.08),
      12,
      random,
    );
    const points = local.map(onEdge);
    cracks.push(crackRibbon(points, 0.075 + random() * 0.08, random));
    const forks = random() > 0.5 ? 2 : 1;
    for (let fork = 0; fork < forks; fork++) {
      const joint = local[3 + fork * 3 + Math.floor(random() * 3)];
      const side =
        fork === 0
          ? joint.x < span / 2
            ? 1
            : -1
          : joint.x < span / 2
            ? -1
            : 1;
      const available = side > 0 ? span - joint.x : joint.x;
      const branchDirection =
        side > 0 ? -0.08 - random() * 0.35 : Math.PI + 0.08 + random() * 0.35;
      const reach = Math.max(
        0.5,
        Math.min(available * 0.8, span * (0.12 + random() * 0.18)),
      );
      const branch = crackSpine(joint, branchDirection, reach, 8, random).map(
        onEdge,
      );
      cracks.push({
        ...crackRibbon(branch, 0.03 + random() * 0.035, random),
        kind: "branch",
      });
      if (fork === 0) {
        facets.push({
          points: [onEdge(joint), points[9], branch[branch.length - 1]]
            .map(glassPoint)
            .join(" "),
          opacity: 0.045 + random() * 0.05,
        });
      }
    }
    for (let chip = 0; chip < 2; chip++) {
      const joint = points[2 + chip];
      const x = joint.x + (random() - 0.5) * 3;
      const y = joint.y + (random() - 0.5) * 3;
      const size = 0.2 + random() * 0.65;
      const direction = random() * Math.PI * 2;
      shards.push({
        points: [
          { x, y: y - size },
          { x: x + size * 0.65, y: y - size * 0.3 },
          { x: x + size * 0.3, y: y + size * (0.5 + random()) },
          { x: x - size * 0.7, y: y + size * 0.35 },
        ]
          .map(glassPoint)
          .join(" "),
        x: `${Math.cos(direction) * (25 + random() * 65)}px`,
        y: `${Math.sin(direction) * (25 + random() * 65)}px`,
        angle: `${(random() - 0.5) * 150}deg`,
        duration: 520 + random() * 280,
        delay: 20 + random() * 90,
      });
    }
  }
  return { width, height, cracks, facets, shards };
}
/** Samples an accelerating inward spiral once; playback only changes compositor properties. */
export function createNeonOrbit(
  x: number,
  y: number,
  random = createVisualRandom(),
): { frames: Keyframe[]; delay: number; duration: number } {
  const radius = Math.hypot(x, y);
  const angle = Math.atan2(y, x);
  const turn = 1.5 + random() * 2.6;
  const tilt = (random() - 0.5) * 64;
  const frames = Array.from({ length: 25 }, (_, index) => {
    const progress = index / 24;
    const remaining = 1 - progress;
    const distance = radius * remaining ** 1.35;
    const orbit = angle + turn * progress ** 1.75;
    const scale = Math.max(0.015, remaining ** 0.85);
    return {
      offset: progress,
      transform: `perspective(700px) translate3d(${Math.cos(orbit) * distance - x}px, ${Math.sin(orbit) * distance - y}px, ${-140 * progress}px) rotateZ(${(turn * progress ** 1.75 * 180) / Math.PI}deg) rotateX(${tilt * progress}deg) scale(${scale * (1 + 0.6 * progress)}, ${scale})`,
      opacity: progress < 0.8 ? 1 : remaining * 5,
    };
  });
  return {
    frames,
    delay: 340 + random() * 160,
    duration: 1000 + random() * 350,
  };
}
