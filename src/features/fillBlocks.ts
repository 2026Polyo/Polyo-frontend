import { PIECES } from "../constants/gameData";
import { cellsAreCoordPairs, makeSpecialValidator } from "./specialPiece";
import type { PieceTemplate } from "../types";

export interface FillTemplate extends PieceTemplate {
  special: "fill";
  color: "fill";
}

// The fill block can be any polyomino shape. When placed, every empty cell orthogonally
// adjacent (up/down/left/right) to the block is filled in too — handy for completing lines.
// The id encodes the shape so the tray solver caches it correctly.
export function createFillTemplate(): FillTemplate {
  const base = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    id: `fill-${base.id}`,
    cells: base.cells.map(([row, col]) => [row, col]),
    color: "fill",
    special: "fill"
  };
}

export function isFillPiece(piece: PieceTemplate | null | undefined): boolean {
  return piece?.special === "fill";
}

export const isValidFillPiece = makeSpecialValidator<FillTemplate>("fill", cellsAreCoordPairs);
