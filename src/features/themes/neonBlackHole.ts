import { createVisualRandom } from "./boardFeedback";

export const NEON_HOLE_LIFETIME_MS = 2250;

type GlassPoint = { x: number; y: number };
const glassPoint = ({ x, y }: GlassPoint) => `${x.toFixed(3)},${y.toFixed(3)}`;
const glassPath = (points: GlassPoint[]) =>
  `M${points.map(glassPoint).join(" L")}`;

/** A few complete seams flash at impact; small chips scatter before the hole opens. */
export function createNeonFractures(random = createVisualRandom()) {
  const count = 5;
  const startAngle = random() * Math.PI * 2;
  const cracks: { path: string; width: number; kind: "main" }[] = [];
  const shards: { points: string; x: string; y: string; angle: string }[] = [];
  for (let index = 0; index < count; index++) {
    const angle =
      startAngle + ((index + (random() - 0.5) * 0.65) * Math.PI * 2) / count;
    const points = [2, 13, 35, 76].map((radius) => {
      const heading = angle + (random() - 0.5) * 0.19;
      return {
        x: 50 + Math.cos(heading) * radius,
        y: 50 + Math.sin(heading) * radius,
      };
    });
    cracks.push({
      path: glassPath(points),
      width: 0.9 + random() * 0.65,
      kind: "main",
    });
    for (let chip = 0; chip < 3; chip++) {
      const joint = points[1];
      const x = joint.x + (random() - 0.5) * 5;
      const y = joint.y + (random() - 0.5) * 5;
      const size = 0.35 + random() * 0.65;
      const direction = angle + (random() - 0.5);
      shards.push({
        points: [
          { x, y: y - size },
          { x: x + size * 0.65, y: y + size * 0.7 },
          { x: x - size * 0.7, y: y + size * 0.35 },
        ]
          .map(glassPoint)
          .join(" "),
        x: `${Math.cos(direction) * (18 + random() * 32)}px`,
        y: `${Math.sin(direction) * (18 + random() * 32)}px`,
        angle: `${(random() - 0.5) * 90}deg`,
      });
    }
  }
  return { cracks, shards };
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
