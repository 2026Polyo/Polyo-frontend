import { describe, expect, it } from "vitest";
import { canPlace, getClosestPlacement, getPlacements, hasMove, placePiece } from "../placement";
import type { Board, PieceInstance, PieceTemplate } from "../../types";

function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

function fullBoard(): Board {
  return Array.from({ length: 8 }, () => Array(8).fill("red"));
}

const single: PieceTemplate = { id: "single", cells: [[0, 0]] };
const duoH: PieceTemplate = { id: "duo-h", cells: [[0, 0], [0, 1]] };
const square: PieceTemplate = { id: "square", cells: [[0, 0], [0, 1], [1, 0], [1, 1]] };
const ghost: PieceTemplate = { id: "ghost-test", cells: [[0, 0]], special: "ghost" };

function makePiece(template: PieceTemplate, color = "cyan"): PieceInstance {
  return { ...template, uid: "test-uid", color };
}

describe("canPlace", () => {
  it("allows placing a single block on empty cell", () => {
    expect(canPlace(emptyBoard(), single, 0, 0)).toBe(true);
  });

  it("rejects placement out of bounds (negative row)", () => {
    expect(canPlace(emptyBoard(), single, -1, 0)).toBe(false);
  });

  it("rejects placement out of bounds (past board edge)", () => {
    expect(canPlace(emptyBoard(), duoH, 0, 7)).toBe(false);
  });

  it("rejects placement on occupied cell", () => {
    const board = emptyBoard();
    board[0][0] = "red";
    expect(canPlace(board, single, 0, 0)).toBe(false);
  });

  it("rejects a 2-cell piece when second cell is occupied", () => {
    const board = emptyBoard();
    board[0][1] = "red";
    expect(canPlace(board, duoH, 0, 0)).toBe(false);
  });

  it("allows ghost block to overlap occupied cells", () => {
    const board = emptyBoard();
    board[0][0] = "red";
    expect(canPlace(board, ghost, 0, 0)).toBe(true);
  });

  it("still rejects ghost block if it would go out of bounds", () => {
    expect(canPlace(emptyBoard(), ghost, -1, 0)).toBe(false);
  });
});

describe("getPlacements", () => {
  it("returns 64 placements for a single block on an empty board", () => {
    expect(getPlacements(emptyBoard(), single)).toHaveLength(64);
  });

  it("returns 0 placements when board is full", () => {
    expect(getPlacements(fullBoard(), single)).toHaveLength(0);
  });

  it("returns correct count for duo-h piece", () => {
    // Each row has 7 valid positions (cols 0-6), 8 rows = 56
    expect(getPlacements(emptyBoard(), duoH)).toHaveLength(56);
  });

  it("returns correct count for 2×2 square", () => {
    // 7 cols × 7 rows = 49
    expect(getPlacements(emptyBoard(), square)).toHaveLength(49);
  });

  it("excludes positions where cells are occupied", () => {
    const board = emptyBoard();
    board[0][0] = "red";
    const placements = getPlacements(board, single);
    expect(placements).toHaveLength(63);
    expect(placements.every(({ row, col }) => !(row === 0 && col === 0))).toBe(true);
  });
});

describe("hasMove", () => {
  it("returns true on an empty board with any piece", () => {
    expect(hasMove(emptyBoard(), [single])).toBe(true);
  });

  it("returns false on a full board with a non-ghost piece", () => {
    expect(hasMove(fullBoard(), [single])).toBe(false);
  });

  it("returns true on a full board when ghost piece is present", () => {
    expect(hasMove(fullBoard(), [ghost])).toBe(true);
  });

  it("returns false with empty piece list", () => {
    expect(hasMove(emptyBoard(), [])).toBe(false);
  });
});

describe("placePiece", () => {
  it("places a block and returns the updated board", () => {
    const piece = makePiece(single);
    const result = placePiece(emptyBoard(), piece, 3, 3);
    expect(result.placedBoard[3][3]).toBe("cyan");
  });

  it("records no cleared cells when no line is completed", () => {
    const piece = makePiece(single);
    const result = placePiece(emptyBoard(), piece, 0, 0);
    expect(result.cleared).toBe(0);
    expect(result.clearedCells).toHaveLength(0);
  });

  it("clears a row when it becomes full after placement", () => {
    const board = emptyBoard();
    // Fill 7 of 8 cells in row 0
    for (let col = 0; col < 7; col += 1) board[0][col] = "red";
    const piece = makePiece(single);
    const result = placePiece(board, piece, 0, 7);
    expect(result.cleared).toBe(1);
    expect(result.clearedRows).toContain(0);
    expect(result.board[0].every((c) => c === null)).toBe(true);
  });

  it("tracks ghost overlapped cells", () => {
    const board = emptyBoard();
    board[2][2] = "red";
    const piece = makePiece({ ...ghost, cells: [[0, 0]] });
    const result = placePiece(board, piece, 2, 2);
    expect(result.overlappedCells).toContain("2-2");
  });
});

describe("getClosestPlacement", () => {
  it("returns null when no piece given", () => {
    expect(getClosestPlacement(emptyBoard(), null, { row: 0, col: 0 })).toBeNull();
  });

  it("returns null when no target given", () => {
    expect(getClosestPlacement(emptyBoard(), single, null)).toBeNull();
  });

  it("returns null when no placements exist", () => {
    expect(getClosestPlacement(fullBoard(), single, { row: 0, col: 0 })).toBeNull();
  });

  it("returns the exact position when target matches a valid placement", () => {
    const result = getClosestPlacement(emptyBoard(), single, { row: 3, col: 3 });
    expect(result).toEqual({ row: 3, col: 3 });
  });

  it("snaps to nearest valid placement", () => {
    const board = emptyBoard();
    // Block off (0,0) so the only option near origin is (0,1)
    board[0][0] = "red";
    const result = getClosestPlacement(board, single, { row: 0, col: 0 });
    // Nearest available cell to (0,0) is (0,1) or (1,0) — distance 1 each
    expect(result).not.toBeNull();
  });
});
