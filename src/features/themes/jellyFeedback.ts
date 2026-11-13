import { SIZE } from "../../constants/gameData";
import {
  createVisualRandom,
  uniqueFeedbackCells,
  type BoardFeedback,
  type FeedbackCell,
} from "./boardFeedback";

export const JELLY_LANDING_MS = 300;
export const JELLY_SLASH_MS = 320;
export const JELLY_BREAK_MS = 440;
export const JELLY_EFFECT_LIFETIME_MS = 1200;
export const JELLY_DROPLET_COUNT = 4;
export const JELLY_SHARD_COUNT = 4;

export interface JellyParticle {
  x: number;
  y: number;
  size: number;
  rotation: number;
  delay: number;
  duration: number;
  shape?: {
    left: number;
    top: number;
    height: number;
    radius: string;
    relaxedRadius: string;
  };
}

export interface JellyImpact {
  x: number;
  y: number;
}

export interface JellySlash {
  axis: "row" | "col";
  index: number;
  start: number;
  length: number;
}

export interface JellyEffectCell extends FeedbackCell {
  particles: JellyParticle[];
  impact?: JellyImpact;
}

export interface JellyEffectBatch {
  id: number;
  placed: JellyEffectCell[];
  cleared: JellyEffectCell[];
  slashes: JellySlash[];
  bounds: { row: number; col: number; rows: number; cols: number } | null;
}

/** 화면 전용 난수는 시작할 때만 생성하고, 프레임별 움직임은 CSS에 맡긴다. */
export function createJellyParticles(
  kind: "drop" | "shard",
  random: () => number = createVisualRandom(),
): JellyParticle[] {
  const between = (min: number, max: number) => min + random() * (max - min);
  const count = kind === "drop" ? JELLY_DROPLET_COUNT : JELLY_SHARD_COUNT;
  const rotation = random() * Math.PI * 2;
  const radiusPercent = () => Math.round(between(30, 76));
  const fourRadii = () => `${radiusPercent()}% ${radiusPercent()}% ${radiusPercent()}% ${radiusPercent()}%`;
  const organicRadius = () => `${fourRadii()} / ${fourRadii()}`;
  return Array.from({ length: count }, (_, index) => {
    // 회전시킨 부채꼴마다 하나씩 배분하고 각도를 흔들어 사방으로 퍼뜨린다.
    const angle =
      rotation + ((index + between(-0.4, 0.4)) / count) * Math.PI * 2;
    const distance = between(
      kind === "drop" ? 22 : 30,
      kind === "drop" ? 58 : 76,
    );
    const size =
      kind === "drop"
        ? between(3, 8)
        : between(index < 2 ? 43 : 25, index < 2 ? 66 : 44);
    const height = size * between(0.6, 1.12);
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      size,
      rotation: between(-160, 160),
      delay:
        kind === "drop"
          ? 180 + between(0, 30)
          : JELLY_BREAK_MS + between(0, 45),
      duration: kind === "drop" ? between(380, 560) : between(460, 620),
      ...(kind === "shard"
        ? {
            shape: {
              left: 50 + Math.cos(angle) * between(10, 19) - size / 2,
              top: 50 + Math.sin(angle) * between(10, 19) - height / 2,
              height,
              radius: organicRadius(),
              relaxedRadius: organicRadius(),
            },
          }
        : {}),
    };
  });
}

/** 참격이 진행하는 방향으로 작은 충격을 준다. 교차점의 합력도 8px로 제한한다. */
export function getJellyImpact(
  cell: FeedbackCell,
  slashes: readonly JellySlash[],
): JellyImpact {
  let x = 0;
  let y = 0;
  for (const slash of slashes) {
    const index = slash.axis === "row" ? cell.row : cell.col;
    const offset = slash.axis === "row" ? cell.col : cell.row;
    if (
      index !== slash.index ||
      offset < slash.start ||
      offset >= slash.start + slash.length
    )
      continue;
    if (slash.axis === "row") x = 1;
    else y = 1;
  }
  const length = Math.hypot(x, y) || 1;
  return { x: (x * 8) / length, y: (y * 8) / length };
}

/** 완성된 가로·세로 줄은 교차점을 포함해 각각 한 번만 벤다. 특수 제거도 남은 구간만 표시한다. */
export function createJellySlashes(
  cells: readonly FeedbackCell[],
): JellySlash[] {
  return slashesForUniqueCells(uniqueFeedbackCells(cells));
}

function slashesForUniqueCells(cells: readonly FeedbackCell[]): JellySlash[] {
  const fullLine = (1 << SIZE) - 1;
  const rows = new Uint8Array(SIZE);
  const cols = new Uint8Array(SIZE);
  for (const { row, col } of cells) {
    rows[row] |= 1 << col;
    cols[col] |= 1 << row;
  }

  const slashes: JellySlash[] = [];
  let coveredCols = 0;
  for (let row = 0; row < SIZE; row++) {
    if (rows[row] === fullLine) slashes.push({ axis: "row", index: row, start: 0, length: SIZE });
  }
  for (let col = 0; col < SIZE; col++) {
    if (cols[col] !== fullLine) continue;
    slashes.push({ axis: "col", index: col, start: 0, length: SIZE });
    coveredCols |= 1 << col;
  }
  for (let row = 0; row < SIZE; row++) {
    if (rows[row] === fullLine) continue;
    const uncovered = rows[row] & ~coveredCols;
    let start = -1;
    for (let col = 0; col <= SIZE; col++) {
      const remaining = (uncovered & (1 << col)) !== 0;
      if (remaining && start < 0) start = col;
      if (!remaining && start >= 0) {
        slashes.push({ axis: "row", index: row, start, length: col - start });
        start = -1;
      }
    }
  }
  return slashes;
}

export function createJellyEffectBatch(
  feedback: BoardFeedback,
): JellyEffectBatch {
  const placed = uniqueFeedbackCells(feedback.placed);
  const cleared = uniqueFeedbackCells(feedback.cleared);
  const slashes = slashesForUniqueCells(cleared);
  const minRow = Math.min(...placed.map((cell) => cell.row));
  const minCol = Math.min(...placed.map((cell) => cell.col));
  return {
    id: feedback.id,
    placed: placed.map((cell) => ({
      ...cell,
      particles: createJellyParticles("drop"),
    })),
    cleared: cleared.map((cell) => ({
      ...cell,
      particles: createJellyParticles("shard"),
      impact: getJellyImpact(cell, slashes),
    })),
    slashes,
    bounds: placed.length
      ? {
          row: minRow,
          col: minCol,
          rows: Math.max(...placed.map((cell) => cell.row)) - minRow + 1,
          cols: Math.max(...placed.map((cell) => cell.col)) - minCol + 1,
        }
      : null,
  };
}
