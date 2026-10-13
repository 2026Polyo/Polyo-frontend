import { SIZE } from "../constants/gameData";
import { clearLines, cloneBoard } from "./boardUtils";
import { shuffleInPlace } from "./shuffle";
import type { Board, PieceInstance, PieceTemplate, PlacementResult, PlacementPosition, CellCoord } from "../types";

export function canPlace(board: Board, piece: PieceTemplate, row: number, col: number): boolean {
  // Ghost blocks may overlap existing blocks; they only need to stay on the board.
  const allowOverlap = piece.special === "ghost";
  return piece.cells.every(([dr, dc]) => {
    const nextRow = row + dr;
    const nextCol = col + dc;
    if (nextRow < 0 || nextRow >= SIZE || nextCol < 0 || nextCol >= SIZE) return false;
    return allowOverlap || !board[nextRow][nextCol];
  });
}

export function getPlacements(board: Board, piece: PieceTemplate): PlacementPosition[] {
  const placements: PlacementPosition[] = [];

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (canPlace(board, piece, row, col)) {
        placements.push({ row, col });
      }
    }
  }

  return placements;
}

export function hasMove(board: Board, pieces: PieceTemplate[]): boolean {
  return pieces.some((piece) => getPlacements(board, piece).length > 0);
}

export function placePiece(board: Board, piece: PieceInstance, row: number, col: number): PlacementResult {
  const next = cloneBoard(board);
  // Cells that already held a block before this piece landed on them (ghost overlap).
  const overlappedCells: string[] = [];
  piece.cells.forEach(([dr, dc]) => {
    const nextRow = row + dr;
    const nextCol = col + dc;
    if (board[nextRow][nextCol]) overlappedCells.push(`${nextRow}-${nextCol}`);
    next[nextRow][nextCol] = piece.color;
  });
  const result = clearLines(next);
  return { ...result, placedBoard: next, overlappedCells };
}

const ADJACENT_DELTAS: CellCoord[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
];

// Empty cells next to the just-placed piece (board should include the piece). The piece's
// own cells are filled, so they are naturally excluded.
function findEmptyNeighbors(
  board: Board,
  piece: PieceTemplate,
  row: number,
  col: number,
  deltas: CellCoord[]
): PlacementPosition[] {
  const seen = new Set<string>();
  const cells: PlacementPosition[] = [];

  piece.cells.forEach(([dr, dc]) => {
    deltas.forEach(([ddr, ddc]) => {
      const nextRow = row + dr + ddr;
      const nextCol = col + dc + ddc;
      const key = `${nextRow}-${nextCol}`;
      if (
        nextRow >= 0 &&
        nextRow < SIZE &&
        nextCol >= 0 &&
        nextCol < SIZE &&
        !board[nextRow][nextCol] &&
        !seen.has(key)
      ) {
        seen.add(key);
        cells.push({ row: nextRow, col: nextCol });
      }
    });
  });

  return cells;
}

// Every empty cell orthogonally adjacent to the placed piece — used by the fill special
// block, which fills all of them.
export function getSurroundingEmptyCells(
  board: Board,
  piece: PieceTemplate,
  row: number,
  col: number
): PlacementPosition[] {
  return findEmptyNeighbors(board, piece, row, col, ADJACENT_DELTAS);
}

export function getPlacementDistanceSquared(
  a: PlacementPosition | null,
  b: PlacementPosition | null
): number {
  if (!a || !b) return Infinity;
  return (a.row - b.row) ** 2 + (a.col - b.col) ** 2;
}

export function getClosestPlacement(
  board: Board,
  piece: PieceTemplate | null,
  target: PlacementPosition | null
): PlacementPosition | null {
  if (!piece || !target) return null;
  const placements = getPlacements(board, piece);
  if (!placements.length) return null;
  return placements.reduce((closest, p) =>
    getPlacementDistanceSquared(p, target) < getPlacementDistanceSquared(closest, target) ? p : closest,
    placements[0]
  );
}

// Pick up to `count` random empty cells next to the placed piece (for the spread-fill augment).
export function getSpreadFillCells(
  board: Board,
  piece: PieceTemplate,
  row: number,
  col: number,
  count: number
): PlacementPosition[] {
  if (count <= 0) return [];

  const candidates = shuffleInPlace(findEmptyNeighbors(board, piece, row, col, ADJACENT_DELTAS));
  return candidates.slice(0, count);
}
