import { describe, expect, it } from "vitest";
import { resolvePlacement } from "../resolvePlacement";
import { chooseAugment, createInitialAugmentState } from "../augments";
import type { Board, PieceInstance } from "../../types";

function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

function instance(overrides: Partial<PieceInstance>): PieceInstance {
  return {
    id: "single",
    uid: "uid",
    color: "cyan",
    cells: [[0, 0]],
    ...overrides
  };
}

const baseInput = () => ({
  augmentState: createInitialAugmentState(),
  bombCells: new Set<string>(),
  boostCells: new Set<string>(),
  ghostCells: new Set<string>(),
  goldenCells: new Set<string>()
});

describe("resolvePlacement", () => {
  it("places a piece and scores its cells when nothing clears", () => {
    const outcome = resolvePlacement({
      ...baseInput(),
      board: emptyBoard(),
      piece: instance({ cells: [[0, 0]] }),
      row: 3,
      col: 3
    });
    expect(outcome.cleared).toBe(0);
    expect(outcome.clearingCells.size).toBe(0);
    expect(outcome.scoreGain).toBe(1);
    expect(outcome.settledBoard[3][3]).toBe("cyan");
    expect(outcome.displayBoard).toBe(outcome.settledBoard);
  });

  it("clears a completed row and settles to an empty board", () => {
    const board = emptyBoard();
    for (let col = 0; col < 7; col += 1) board[0][col] = "red";
    const outcome = resolvePlacement({
      ...baseInput(),
      board,
      piece: instance({ cells: [[0, 0]] }),
      row: 0,
      col: 7
    });
    expect(outcome.cleared).toBe(1);
    expect(outcome.clearingCells.size).toBe(8);
    expect(outcome.scoreGain).toBe(21); // placement 1 + clear 20
    expect(outcome.settledBoard[0].every((c) => c === null)).toBe(true);
    // displayBoard still shows the pre-clear (filled) row while the highlight animates.
    expect(outcome.displayBoard[0].every((c) => c !== null)).toBe(true);
  });

  it("marks golden cells laid by a golden piece", () => {
    const outcome = resolvePlacement({
      ...baseInput(),
      board: emptyBoard(),
      piece: instance({ id: "golden", special: "golden", color: "golden", cells: [[0, 0]] }),
      row: 4,
      col: 5
    });
    expect(outcome.goldenCells.has("4-5")).toBe(true);
  });

  it("adds the echo bonus based on the board before placement", () => {
    const board = emptyBoard();
    board[1][1] = "red";
    board[2][2] = "red";
    const outcome = resolvePlacement({
      ...baseInput(),
      board,
      piece: instance({ id: "echo", special: "echo", color: "echo", cells: [[0, 0]] }),
      row: 5,
      col: 5
    });
    expect(outcome.scoreGain).toBe(11); // placement 1 + echo (2 cells × 5)
  });

  it("keeps a bomb mark when its block is not cleared", () => {
    const outcome = resolvePlacement({
      ...baseInput(),
      board: emptyBoard(),
      piece: instance({ id: "bomb", special: "bomb", color: "bomb", cells: [[0, 0]] }),
      row: 4,
      col: 4
    });
    expect(outcome.cleared).toBe(0);
    expect(outcome.bombCells.has("4-4")).toBe(true);
  });

  it("detonates a bomb that completes a line, wiping its row and column", () => {
    // Fill column 7 (rows 0..6) and row 0 (cols 0..6) so placing the bomb at (0,7)
    // completes row 0, clearing the bomb cell and triggering its cross-blast.
    const board = emptyBoard();
    for (let col = 0; col < 7; col += 1) board[0][col] = "red";
    for (let row = 1; row < 7; row += 1) board[row][7] = "blue";
    const outcome = resolvePlacement({
      ...baseInput(),
      board,
      piece: instance({ id: "bomb", special: "bomb", color: "bomb", cells: [[0, 0]] }),
      row: 0,
      col: 7
    });
    expect(outcome.cleared).toBe(1); // one completed line (row 0)
    // Column 7 was wiped by the detonation even though it never formed a full line.
    expect(outcome.settledBoard.every((r) => r[7] === null)).toBe(true);
    expect(outcome.bombCells.size).toBe(0);
    // 6 column cells destroyed by the blast × BOMB_CLEAR_BONUS (5), plus line score.
    expect(outcome.scoreGain).toBeGreaterThan(21);
  });

  it("fills empty cells within one step of a fill block", () => {
    const outcome = resolvePlacement({
      ...baseInput(),
      board: emptyBoard(),
      piece: instance({ id: "fill", special: "fill", color: "fill", cells: [[0, 0]] }),
      row: 4,
      col: 4
    });
    // A 1×1 fill block at (4,4) fills its 4 orthogonal neighbours (not diagonals).
    expect(outcome.settledBoard[3][4]).toBe("fill");
    expect(outcome.settledBoard[5][4]).toBe("fill");
    expect(outcome.settledBoard[4][3]).toBe("fill");
    expect(outcome.settledBoard[4][5]).toBe("fill");
    expect(outcome.settledBoard[4][4]).toBe("fill");
    expect(outcome.settledBoard[3][3]).toBeNull(); // diagonal stays empty
    // placement score counts the placed cell (1) plus the 4 filled cells.
    expect(outcome.scoreGain).toBe(5);
  });

  it("lets a fill block complete and clear a line", () => {
    // Row 0 missing only (0,1); placing a fill block at (0,0) fills (0,1) and clears row 0.
    const board = emptyBoard();
    for (let col = 2; col < 8; col += 1) board[0][col] = "red";
    const outcome = resolvePlacement({
      ...baseInput(),
      board,
      piece: instance({ id: "fill", special: "fill", color: "fill", cells: [[0, 0]] }),
      row: 0,
      col: 0
    });
    expect(outcome.cleared).toBe(1);
    expect(outcome.settledBoard[0].every((c) => c === null)).toBe(true);
  });

  it("marks boost cells laid by a boost piece without boosting its own placement", () => {
    const outcome = resolvePlacement({
      ...baseInput(),
      board: emptyBoard(),
      piece: instance({ id: "boost", special: "boost", color: "boost", cells: [[0, 0]] }),
      row: 2,
      col: 2
    });
    expect(outcome.boostCells.has("2-2")).toBe(true);
    expect(outcome.scoreGain).toBe(1); // no boost active yet for the placing move
  });

  it("multiplies the score while a boost cell sits on the board", () => {
    // Row 0 missing only (0,0); a single block there clears the row (placement 1 + clear 20 = 21).
    const board = emptyBoard();
    for (let col = 1; col < 8; col += 1) board[0][col] = "red";
    const outcome = resolvePlacement({
      ...baseInput(),
      boostCells: new Set(["7-7"]), // one boost cell active → ×1.05
      board,
      piece: instance({ cells: [[0, 0]] }),
      row: 0,
      col: 0
    });
    expect(outcome.scoreGain).toBe(Math.round(21 * 1.05)); // 22, vs 21 without the boost
    expect(outcome.boostCells.has("7-7")).toBe(true); // boost block survives (not on row 0)
  });

  it("preview mode skips random spread augments for a deterministic score", () => {
    // Own spread-fill, which would randomly add cells; preview must ignore it.
    const augmentState = chooseAugment(createInitialAugmentState(), "spread-fill", 0);
    for (let i = 0; i < 30; i += 1) {
      const outcome = resolvePlacement({
        augmentState,
        bombCells: new Set(),
        boostCells: new Set(),
        ghostCells: new Set(),
        goldenCells: new Set(),
        board: emptyBoard(),
        piece: instance({ cells: [[0, 0]] }),
        row: 4,
        col: 4,
        preview: true
      });
      expect(outcome.scoreGain).toBe(1); // placement of 1 cell, no spread, no clear
      expect(outcome.extraCells).toBe(0);
    }
  });

  it("awards the all-clear augment bonus when the board empties", () => {
    const board = emptyBoard();
    for (let col = 0; col < 7; col += 1) board[0][col] = "red";
    const augmentState = chooseAugment(createInitialAugmentState(), "all-clear", 0);
    const outcome = resolvePlacement({
      augmentState,
      bombCells: new Set(),
      boostCells: new Set(),
      ghostCells: new Set(),
      goldenCells: new Set(),
      board,
      piece: instance({ cells: [[0, 0]] }),
      row: 0,
      col: 7
    });
    expect(outcome.cleared).toBe(1);
    expect(outcome.scoreGain).toBe(71); // placement 1 + clear 20 + all-clear 50
  });
});
