import { PIECES } from "../constants/gameData";
import { cellsAreCoordPairs, makeSpecialValidator } from "./specialPiece";
import type { PieceTemplate } from "../types";

// Each boost-block cell on the board raises the score gained per placement by this fraction.
export const BOOST_RATE_PER_CELL = 0.05;

export interface BoostTemplate extends PieceTemplate {
  special: "boost";
  color: "boost";
}

// The boost block can be any polyomino shape. While its cells sit on the board, every
// placement scores more; the effect fades when its cells are cleared. The id encodes the
// shape so the tray solver caches it correctly.
export function createBoostTemplate(): BoostTemplate {
  const base = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    id: `boost-${base.id}`,
    cells: base.cells.map(([row, col]) => [row, col]),
    color: "boost",
    special: "boost"
  };
}

export function isBoostPiece(piece: PieceTemplate | null | undefined): boolean {
  return piece?.special === "boost";
}

export const isValidBoostPiece = makeSpecialValidator<BoostTemplate>("boost", cellsAreCoordPairs);

// Score multiplier applied to a placement while `cellCount` boost-block cells are on the board.
export function getBoostMultiplier(cellCount: number): number {
  return 1 + BOOST_RATE_PER_CELL * cellCount;
}
