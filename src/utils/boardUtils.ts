import { SIZE } from "../constants/gameData";
import { shuffleInPlace } from "./shuffle";
import type { Board, ClearedResult } from "../types";

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export interface GravitySimulation {
  /** Board states for the fall animation, one per visible step (excludes the start board). */
  frames: Board[];
  /** Final settled board after all falls and line clears. */
  finalBoard: Board;
  /** Original "row-col" key → final key for every surviving cell; cleared cells are omitted. */
  moved: Map<string, string>;
}

// Simulate gravity as a cascade: filled cells fall one row at a time; whenever a row fills up
// it clears, letting the cells above keep falling. Returns the animation frames, the final
// board, and a move map so callers can relocate position-keyed marks (ghost/golden/bomb/boost)
// and drop the ones that were cleared.
export function simulateGravity(board: Board): GravitySimulation {
  const colors: Board = cloneBoard(board);
  // Track each cell's original key so we can build the net move map across the whole cascade.
  const ids: (string | null)[][] = board.map((row, r) =>
    row.map((cell, c) => (cell ? `${r}-${c}` : null))
  );
  const frames: Board[] = [];

  const dropOneStep = (): boolean => {
    let moved = false;
    // Bottom-up so each cell falls exactly one row per step (a simultaneous one-row drop).
    for (let r = SIZE - 2; r >= 0; r -= 1) {
      for (let c = 0; c < SIZE; c += 1) {
        if (colors[r][c] && !colors[r + 1][c]) {
          colors[r + 1][c] = colors[r][c];
          ids[r + 1][c] = ids[r][c];
          colors[r][c] = null;
          ids[r][c] = null;
          moved = true;
        }
      }
    }
    return moved;
  };

  let safety = SIZE * SIZE * 4;
  for (;;) {
    while (dropOneStep()) {
      frames.push(cloneBoard(colors));
      if (--safety <= 0) break;
    }

    const fullRows: number[] = [];
    for (let r = 0; r < SIZE; r += 1) {
      if (colors[r].every(Boolean)) fullRows.push(r);
    }
    if (!fullRows.length || safety <= 0) break;

    fullRows.forEach((r) => {
      for (let c = 0; c < SIZE; c += 1) {
        colors[r][c] = null;
        ids[r][c] = null;
      }
    });
    frames.push(cloneBoard(colors));
    if (--safety <= 0) break;
  }

  const moved = new Map<string, string>();
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const id = ids[r][c];
      if (id) moved.set(id, `${r}-${c}`);
    }
  }

  return { frames, finalBoard: colors, moved };
}

export function isBoardEmpty(board: Board): boolean {
  return board.every((row) => row.every((cell) => !cell));
}

// Count filled cells orthogonally adjacent to the given rows/cols but not inside them — used
// by the 균열 제거 augment to reward blocks bordering the lines being cleared.
export function countAdjacentBlocks(board: Board, rows: number[], cols: number[]): number {
  const rowSet = new Set(rows);
  const colSet = new Set(cols);
  const seen = new Set<string>();
  const height = board.length;
  const width = board[0]?.length ?? 0;

  const consider = (r: number, c: number) => {
    if (r < 0 || r >= height || c < 0 || c >= width) return;
    if (rowSet.has(r) || colSet.has(c)) return; // skip cells inside a cleared line
    if (!board[r][c]) return;
    seen.add(`${r}-${c}`);
  };

  rows.forEach((r) => {
    for (let c = 0; c < width; c += 1) { consider(r - 1, c); consider(r + 1, c); }
  });
  cols.forEach((c) => {
    for (let r = 0; r < height; r += 1) { consider(r, c - 1); consider(r, c + 1); }
  });

  return seen.size;
}

export function clearLines(board: Board): ClearedResult {
  const fullRows = board
    .map((row, index) => (row.every(Boolean) ? index : null))
    .filter((row): row is number => row !== null);
  const fullCols = Array.from({ length: SIZE }, (_, col) =>
    board.every((row) => row[col]) ? col : null
  ).filter((col): col is number => col !== null);
  const clearedCells = new Set<string>();

  if (!fullRows.length && !fullCols.length) {
    return { board, cleared: 0, clearedCells: [], clearedRows: [], clearedCols: [] };
  }

  const next = cloneBoard(board);
  fullRows.forEach((row) => {
    for (let col = 0; col < SIZE; col += 1) {
      clearedCells.add(`${row}-${col}`);
      next[row][col] = null;
    }
  });
  fullCols.forEach((col) => {
    for (let row = 0; row < SIZE; row += 1) {
      clearedCells.add(`${row}-${col}`);
      next[row][col] = null;
    }
  });

  return {
    board: next,
    cleared: fullRows.length + fullCols.length,
    clearedCells: [...clearedCells],
    clearedRows: fullRows,
    clearedCols: fullCols
  };
}

// Null out the given row/col indices entirely; returns the new board and the cells that held blocks.
export function clearLineIndices(
  board: Board,
  rows: number[],
  cols: number[]
): { board: Board; clearedCells: string[] } {
  const next = cloneBoard(board);
  const clearedCells: string[] = [];

  rows.forEach((row) => {
    for (let col = 0; col < SIZE; col += 1) {
      if (next[row][col]) clearedCells.push(`${row}-${col}`);
      next[row][col] = null;
    }
  });
  cols.forEach((col) => {
    for (let row = 0; row < SIZE; row += 1) {
      if (next[row][col]) clearedCells.push(`${row}-${col}`);
      next[row][col] = null;
    }
  });

  return { board: next, clearedCells };
}

// Choose up to `count` lines adjacent to the already-cleared rows/cols (for the spread-clear augment).
export function pickAdjacentLines(
  clearedRows: number[],
  clearedCols: number[],
  count: number
): { rows: number[]; cols: number[] } {
  if (count <= 0) return { rows: [], cols: [] };

  const clearedRowSet = new Set(clearedRows);
  const clearedColSet = new Set(clearedCols);
  const seen = new Set<string>();
  const candidates: Array<{ type: "row" | "col"; index: number }> = [];

  clearedRows.forEach((row) => {
    [row - 1, row + 1].forEach((nextRow) => {
      const key = `row-${nextRow}`;
      if (nextRow >= 0 && nextRow < SIZE && !clearedRowSet.has(nextRow) && !seen.has(key)) {
        seen.add(key);
        candidates.push({ type: "row", index: nextRow });
      }
    });
  });
  clearedCols.forEach((col) => {
    [col - 1, col + 1].forEach((nextCol) => {
      const key = `col-${nextCol}`;
      if (nextCol >= 0 && nextCol < SIZE && !clearedColSet.has(nextCol) && !seen.has(key)) {
        seen.add(key);
        candidates.push({ type: "col", index: nextCol });
      }
    });
  });

  const chosen = shuffleInPlace(candidates).slice(0, count);
  return {
    rows: chosen.filter((line) => line.type === "row").map((line) => line.index),
    cols: chosen.filter((line) => line.type === "col").map((line) => line.index)
  };
}

// Extend a clear result by also clearing `extraLineCount` lines next to the cleared ones.
export function applySpreadClear(result: ClearedResult, extraLineCount: number): ClearedResult {
  if (extraLineCount <= 0 || (!result.clearedRows.length && !result.clearedCols.length)) {
    return result;
  }

  const { rows, cols } = pickAdjacentLines(result.clearedRows, result.clearedCols, extraLineCount);
  if (!rows.length && !cols.length) return result;

  const extra = clearLineIndices(result.board, rows, cols);
  return {
    ...result,
    board: extra.board,
    cleared: result.cleared + rows.length + cols.length,
    clearedCells: [...result.clearedCells, ...extra.clearedCells],
    clearedRows: [...result.clearedRows, ...rows],
    clearedCols: [...result.clearedCols, ...cols]
  };
}
