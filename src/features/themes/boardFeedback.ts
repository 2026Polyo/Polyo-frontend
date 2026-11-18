import { SIZE } from "../../constants/gameData";
import type { Board, PieceInstance } from "../../types";

export interface FeedbackCell {
  row: number;
  col: number;
  color: string;
}

export interface BoardFeedback {
  id: number;
  placed: FeedbackCell[];
  cleared: FeedbackCell[];
}

/** 실제로 성공한 배치에서만 호출한다. 보드 차이로 추측하지 않아 되돌리기·불러오기는 제외된다. */
export function createBoardFeedback(
  id: number,
  piece: PieceInstance,
  row: number,
  col: number,
  displayBoard: Board,
  clearingCells: ReadonlySet<string>,
): BoardFeedback {
  const placed = piece.cells.map(([dr, dc]) => ({
    row: row + dr,
    col: col + dc,
    color: piece.color,
  }));
  const cleared = [...clearingCells].flatMap((key) => {
    const match = /^(\d+)-(\d+)$/.exec(key);
    if (!match) return [];
    const r = Number(match[1]);
    const c = Number(match[2]);
    const color = displayBoard[r]?.[c];
    // 특수 제거 범위의 빈 칸에서는 가짜 블록이나 아이템을 만들지 않는다.
    return color ? [{ row: r, col: c, color }] : [];
  });
  return {
    id,
    placed: uniqueFeedbackCells(placed),
    cleared: uniqueFeedbackCells(cleared),
  };
}

export function uniqueFeedbackCells(
  cells: readonly FeedbackCell[],
): FeedbackCell[] {
  const unique = new Map<string, FeedbackCell>();
  for (const cell of cells) {
    if (
      !Number.isInteger(cell.row) ||
      !Number.isInteger(cell.col) ||
      cell.row < 0 ||
      cell.row >= SIZE ||
      cell.col < 0 ||
      cell.col >= SIZE
    )
      continue;
    unique.set(`${cell.row}-${cell.col}`, { ...cell });
  }
  return [...unique.values()];
}

export const PIXEL_EFFECT_LIFETIME_MS = 1400;
export const PLACEMENT_EFFECT_LIFETIME_MS = 800;
export const MAX_EFFECT_BATCHES = 2;
export const PLACEMENT_PARTICLE_COUNT = 9;
export const MELT_GRID_SIZE = 5;
// 한 보드의 모든 칸이 배치·제거되어도 한 묶음(최대 2176개)은 수용한다.
export const MAX_ACTIVE_PARTICLES = 2200;

export interface PixelParticle {
  x: number;
  y: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
}

/** 게임의 Math.random을 소비하지 않는 화면 전용 난수 생성기. */
export function createVisualRandom(): () => number {
  let seed = globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** 아래의 인접 칸에서 위로 전파한다. 정렬·탐색 없이 작은 격자를 한 번만 순회한다. */
function createMeltDelays(random: () => number): number[] {
  const delays = new Array<number>(MELT_GRID_SIZE ** 2);
  const startColumn = Math.floor(random() * MELT_GRID_SIZE);
  const offset = random() * 60;
  for (let row = MELT_GRID_SIZE - 1; row >= 0; row--) {
    for (let col = 0; col < MELT_GRID_SIZE; col++) {
      const index = row * MELT_GRID_SIZE + col;
      if (row === MELT_GRID_SIZE - 1) {
        delays[index] =
          offset + Math.abs(col - startColumn) * 18 + random() * 60;
        continue;
      }
      const below = index + MELT_GRID_SIZE;
      const arrival = Math.min(
        delays[below],
        col > 0 ? delays[below - 1] : Infinity,
        col < MELT_GRID_SIZE - 1 ? delays[below + 1] : Infinity,
      );
      delays[index] = arrival + 70 + random() * 40;
    }
  }
  return delays;
}

/** 한 효과가 시작될 때 한 번 생성하고 수명이 끝날 때까지 같은 값을 사용한다. */
export function createPixelParticles(
  kind: "place" | "clear",
  random: () => number = createVisualRandom(),
): PixelParticle[] {
  const between = (min: number, max: number) => min + random() * (max - min);
  const count =
    kind === "place" ? PLACEMENT_PARTICLE_COUNT : MELT_GRID_SIZE ** 2;
  const rotation = kind === "place" ? random() * Math.PI * 2 : 0;
  const meltDelays = kind === "clear" ? createMeltDelays(random) : [];
  return Array.from({ length: count }, (_, index) => {
    if (kind === "place") {
      // 원 둘레를 고르게 채우되 매번 각도를 흔들어 같은 모양이 반복되지 않게 한다.
      const angle =
        rotation + ((index + between(-0.3, 0.3)) * Math.PI * 2) / count;
      const radius = between(76, 80);
      const directionX = Math.cos(angle);
      const directionY = Math.sin(angle);
      const speed = between(45, 145);
      const duration = between(360, 580);
      const distance = (speed * duration) / 1000;
      return {
        x: directionX * distance,
        y: directionY * distance,
        left: 50 + directionX * radius,
        top: 50 + directionY * radius,
        size: between(2, 5.5),
        delay: between(0, 35),
        duration,
      };
    }
    const row = Math.floor(index / MELT_GRID_SIZE);
    const col = index % MELT_GRID_SIZE;
    return {
      x: between(-4, 4),
      y: between(6, 20),
      left: (col * 100) / MELT_GRID_SIZE,
      top: (row * 100) / MELT_GRID_SIZE,
      size: 100 / MELT_GRID_SIZE,
      delay: meltDelays[index],
      duration: between(620, 720),
    };
  });
}
