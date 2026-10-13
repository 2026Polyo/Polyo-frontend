import { PIECES } from "../constants/gameData";
import { cellsAreCoordPairs, makeSpecialValidator } from "./specialPiece";
import type { Board, PieceTemplate } from "../types";

export const ECHO_SCORE_PER_CELL = 5;

export interface EchoTemplate extends PieceTemplate {
  special: "echo";
  color: "echo";
}

// The echo block can be any polyomino shape; its bonus depends on the board state, not the
// shape. The id encodes the shape so the tray solver caches it correctly.
export function createEchoTemplate(): EchoTemplate {
  const base = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    id: `echo-${base.id}`,
    cells: base.cells.map(([row, col]) => [row, col]),
    color: "echo",
    special: "echo"
  };
}

export function isEchoPiece(piece: PieceTemplate | null | undefined): boolean {
  return piece?.special === "echo";
}

export const isValidEchoPiece = makeSpecialValidator<EchoTemplate>("echo", cellsAreCoordPairs);

// Count filled cells on the board before the echo piece lands.
export function getEchoScore(board: Board): number {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell) count += 1;
    }
  }
  return count * ECHO_SCORE_PER_CELL;
}
