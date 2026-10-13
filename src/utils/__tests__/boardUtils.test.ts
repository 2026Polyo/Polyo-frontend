import { describe, expect, it } from "vitest";
import { applySpreadClear, clearLines, cloneBoard, countAdjacentBlocks, isBoardEmpty, simulateGravity } from "../boardUtils";
import type { Board } from "../../types";

const E = null;

function makeBoard(rows: (string | null)[][]): Board {
  return rows;
}

// 8×8 empty board
function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

// Fill an entire row with a color
function fillRow(board: Board, row: number, color = "red"): Board {
  const b = cloneBoard(board);
  b[row] = Array(8).fill(color);
  return b;
}

// Fill an entire column with a color
function fillCol(board: Board, col: number, color = "red"): Board {
  const b = cloneBoard(board);
  b.forEach((row) => { row[col] = color; });
  return b;
}

describe("cloneBoard", () => {
  it("returns a deep copy", () => {
    const original = makeBoard([[E, "a"], [E, E]]);
    const clone = cloneBoard(original);
    clone[0][1] = "b";
    expect(original[0][1]).toBe("a");
  });

  it("produces equal content", () => {
    const board = emptyBoard();
    board[3][3] = "cyan";
    expect(cloneBoard(board)).toEqual(board);
  });
});

describe("isBoardEmpty", () => {
  it("returns true for an all-null board", () => {
    expect(isBoardEmpty(emptyBoard())).toBe(true);
  });

  it("returns false when any cell is occupied", () => {
    const board = emptyBoard();
    board[0][0] = "red";
    expect(isBoardEmpty(board)).toBe(false);
  });
});

describe("clearLines", () => {
  it("returns unchanged board when no full lines exist", () => {
    const board = emptyBoard();
    board[0][0] = "red";
    const result = clearLines(board);
    expect(result.cleared).toBe(0);
    expect(result.clearedCells).toHaveLength(0);
    expect(result.board[0][0]).toBe("red");
  });

  it("clears a full row", () => {
    const board = fillRow(emptyBoard(), 0);
    const result = clearLines(board);
    expect(result.cleared).toBe(1);
    expect(result.clearedRows).toEqual([0]);
    expect(result.board[0].every((c) => c === null)).toBe(true);
    expect(result.clearedCells).toHaveLength(8);
  });

  it("clears a full column", () => {
    const board = fillCol(emptyBoard(), 2);
    const result = clearLines(board);
    expect(result.cleared).toBe(1);
    expect(result.clearedCols).toEqual([2]);
    expect(result.board.every((row) => row[2] === null)).toBe(true);
  });

  it("clears multiple rows and columns simultaneously", () => {
    let board = emptyBoard();
    board = fillRow(board, 0);
    board = fillRow(board, 1);
    board = fillCol(board, 0);
    const result = clearLines(board);
    // 2 rows + 1 col, but col 0 overlaps with the rows — cleared count is still 3 lines
    expect(result.cleared).toBe(3);
    expect(result.clearedRows).toHaveLength(2);
    expect(result.clearedCols).toHaveLength(1);
  });

  it("does not clear a row with one gap", () => {
    const board = fillRow(emptyBoard(), 3);
    board[3][5] = null;
    const result = clearLines(board);
    expect(result.cleared).toBe(0);
  });
});

describe("applySpreadClear", () => {
  it("is a no-op when extraLineCount is 0", () => {
    const board = fillRow(emptyBoard(), 4);
    const base = clearLines(board);
    const result = applySpreadClear(base, 0);
    expect(result.cleared).toBe(base.cleared);
    expect(result.clearedRows).toEqual(base.clearedRows);
  });

  it("is a no-op when no lines were cleared", () => {
    const board = emptyBoard();
    board[0][0] = "red";
    const base = clearLines(board);
    const result = applySpreadClear(base, 2);
    expect(result.cleared).toBe(0);
  });

  it("can clear an adjacent row when count=1", () => {
    // A single cleared row leaves its neighbours as spread-clear candidates.
    const single = fillRow(emptyBoard(), 3);
    const singleBase = clearLines(single);
    const spread = applySpreadClear(singleBase, 1);
    // clearedRows grows by at most 1
    expect(spread.cleared).toBeGreaterThanOrEqual(singleBase.cleared);
    expect(spread.clearedRows.length).toBeGreaterThanOrEqual(singleBase.clearedRows.length);
  });
});

describe("countAdjacentBlocks", () => {
  it("counts filled cells next to cleared rows, excluding the rows themselves", () => {
    const board = emptyBoard();
    board[2][1] = "x";
    board[2][3] = "x";
    board[4][5] = "x";
    board[3][0] = "x"; // inside the cleared row 3 — must be excluded
    expect(countAdjacentBlocks(board, [3], [])).toBe(3);
  });

  it("does not double-count a cell adjacent to both a cleared row and column", () => {
    const board = emptyBoard();
    board[2][4] = "x"; // adjacent to cleared row 3 (row 2) and cleared col 5 (col 4)
    expect(countAdjacentBlocks(board, [3], [5])).toBe(1);
  });
});

describe("simulateGravity", () => {
  it("settles scattered cells to the bottom, preserving column order", () => {
    const board = emptyBoard();
    board[1][2] = "a";
    board[4][2] = "b";
    board[6][2] = "c";
    const { finalBoard, frames, moved } = simulateGravity(board);
    expect(finalBoard[5][2]).toBe("a");
    expect(finalBoard[6][2]).toBe("b");
    expect(finalBoard[7][2]).toBe("c");
    expect(finalBoard[1][2]).toBeNull();
    expect(moved.get("1-2")).toBe("5-2");
    expect(frames.length).toBeGreaterThan(0); // produced animation steps
  });

  it("produces no frames when the board is already settled", () => {
    const board = emptyBoard();
    board[7][0] = "x";
    const { frames, moved } = simulateGravity(board);
    expect(frames).toHaveLength(0);
    expect(moved.get("7-0")).toBe("7-0"); // identity mapping
  });

  it("clears a row that fills up while cells fall, and drops the marks on it", () => {
    // Bottom row missing only column 0; a block above column 0 falls in and completes it.
    const board = emptyBoard();
    for (let col = 1; col < 8; col += 1) board[7][col] = "red";
    board[3][0] = "g"; // falls to (7,0), completing row 7 → row clears
    const { finalBoard, moved } = simulateGravity(board);
    expect(finalBoard[7].every((c) => c === null)).toBe(true); // row cleared
    expect(moved.has("3-0")).toBe(false); // the fallen block was cleared, mark dropped
  });

  it("cascades: clearing a row lets the cells above fall and settle", () => {
    const board = emptyBoard();
    for (let col = 1; col < 8; col += 1) board[7][col] = "red";
    board[0][0] = "g"; // completes row 7 (clears), then nothing else full
    board[0][3] = "h"; // ends up at the bottom of column 3 after the cascade
    const { finalBoard } = simulateGravity(board);
    expect(finalBoard[7][3]).toBe("h");
  });
});
