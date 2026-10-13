import { PIECES } from "../constants/gameData";
import { cellsAreCoordPairs, makeSpecialValidator } from "./specialPiece";
import type { PieceTemplate } from "../types";

export interface GoldenTemplate extends PieceTemplate {
  special: "golden";
  color: "golden";
}

export function createGoldenTemplate(): GoldenTemplate {
  const base = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    id: `golden-${base.id}`,
    cells: base.cells.map(([row, col]) => [row, col]),
    color: "golden",
    special: "golden"
  };
}

export function isGoldenPiece(piece: PieceTemplate | null | undefined): boolean {
  return piece?.special === "golden";
}

export const isValidGoldenPiece = makeSpecialValidator<GoldenTemplate>("golden", cellsAreCoordPairs);

// When golden cells are cleared, add 1x extra per cell (= 2x total).
// clearScore is the score already awarded for the lines cleared this turn.
export function resolveGoldenClears(
  goldenCells: Set<string>,
  clearedCells: Set<string>,
  clearScore: number
): { bonus: number; goldenCells: Set<string> } {
  if (!goldenCells.size || !clearedCells.size || clearScore === 0) {
    return { bonus: 0, goldenCells };
  }
  const perCellScore = clearScore / clearedCells.size;
  let clearedCount = 0;
  const remaining = new Set<string>();
  goldenCells.forEach((key) => {
    if (clearedCells.has(key)) clearedCount += 1;
    else remaining.add(key);
  });
  return {
    bonus: Math.round(clearedCount * perCellScore),
    goldenCells: remaining
  };
}
