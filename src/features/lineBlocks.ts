import { PIECES } from "../constants/gameData";
import { clearLineIndices } from "../utils/boardUtils";
import { cellsAreCoordPairs, makeSpecialValidator } from "./specialPiece";
import type { Board, CellCoord, ClearedResult, PieceTemplate } from "../types";

export interface LineTemplate extends PieceTemplate {
  special: "line";
  color: "line";
}

// The line block can be any polyomino shape. When placed it clears every block in the row
// and column of each of its cells (a cross through every cell). The id encodes the shape so
// the tray solver caches it correctly.
export function createLineTemplate(): LineTemplate {
  const base = PIECES[Math.floor(Math.random() * PIECES.length)];
  return {
    id: `line-${base.id}`,
    cells: base.cells.map(([row, col]) => [row, col]),
    color: "line",
    special: "line"
  };
}

export function isLinePiece(piece: PieceTemplate | null | undefined): boolean {
  return piece?.special === "line";
}

export const isValidLinePiece = makeSpecialValidator<LineTemplate>("line", cellsAreCoordPairs);

// Clear the full row and column of every cell the line block occupies. `cells` are absolute
// board coordinates. Returns a result shaped like clearLines/placePiece output so it slots
// into the normal placement flow.
export function applyLineClear(placedBoard: Board, cells: CellCoord[]): ClearedResult {
  const rows = [...new Set(cells.map(([row]) => row))];
  const cols = [...new Set(cells.map(([, col]) => col))];
  const { board, clearedCells } = clearLineIndices(placedBoard, rows, cols);
  return {
    board,
    cleared: rows.length + cols.length,
    clearedCells,
    clearedRows: rows,
    clearedCols: cols
  };
}
