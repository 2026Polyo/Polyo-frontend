import { PIECES, SIZE } from "../constants/gameData";
import { cloneBoard } from "../utils/boardUtils";
import { cellsAreCoordPairs, makeSpecialValidator } from "./specialPiece";
import type { Board, PieceTemplate } from "../types";

// Each cell destroyed by a bomb detonation is worth this many points.
export const BOMB_CLEAR_BONUS = 5;

export interface BombTemplate extends PieceTemplate {
  special: "bomb";
  color: "bomb";
}

// The bomb block can be any polyomino shape. It is placed like a normal block; the explosion
// is delayed — each of its cells triggers when that cell is cleared by a completed line,
// wiping the entire row and column through it. The id encodes the shape for solver caching.
export function createBombTemplate(): BombTemplate {
  const base = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    id: `bomb-${base.id}`,
    cells: base.cells.map(([row, col]) => [row, col]),
    color: "bomb",
    special: "bomb"
  };
}

export function isBombPiece(piece: PieceTemplate | null | undefined): boolean {
  return piece?.special === "bomb";
}

export const isValidBombPiece = makeSpecialValidator<BombTemplate>("bomb", cellsAreCoordPairs);

export interface BombResolution {
  board: Board;
  bombCells: Set<string>;
  /** Extra cells destroyed by detonations (for the clear highlight). */
  clearedCells: string[];
  bonus: number;
}

// Detonate every marked bomb whose cell is cleared this turn. Each detonation wipes the full
// row and column through it; if that wipe removes another marked bomb, it chains. `board` is
// the already-settled board (line clears applied); `clearedCells` is the set flashing this turn.
export function resolveBombClears(
  bombCells: Set<string>,
  clearedCells: Set<string>,
  board: Board
): BombResolution {
  // Bombs detonate only when their own cell is among the cells cleared this turn.
  const triggered: string[] = [];
  const remaining = new Set(bombCells);
  remaining.forEach((key) => {
    if (clearedCells.has(key)) {
      triggered.push(key);
      remaining.delete(key);
    }
  });

  if (!triggered.length) {
    return { board, bombCells: remaining, clearedCells: [], bonus: 0 };
  }

  const nextBoard = cloneBoard(board);
  const cleared = new Set(clearedCells);
  const extraCleared: string[] = [];
  const queue = [...triggered];

  while (queue.length) {
    const [row, col] = queue.shift()!.split("-").map(Number);
    for (let i = 0; i < SIZE; i += 1) {
      for (const [r, c] of [[row, i], [i, col]] as const) {
        const key = `${r}-${c}`;
        const hadBlock = nextBoard[r][c] !== null;
        nextBoard[r][c] = null;
        if (hadBlock && !cleared.has(key)) {
          cleared.add(key);
          extraCleared.push(key);
        }
        // A bomb caught in this blast detonates too.
        if (remaining.has(key)) {
          remaining.delete(key);
          queue.push(key);
        }
      }
    }
  }

  return {
    board: nextBoard,
    bombCells: remaining,
    clearedCells: extraCleared,
    bonus: extraCleared.length * BOMB_CLEAR_BONUS
  };
}
