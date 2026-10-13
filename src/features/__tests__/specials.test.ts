import { describe, expect, it } from "vitest";
import { resolveBombClears } from "../bombBlocks";
import { getEchoScore, isValidEchoPiece } from "../echoBlocks";
import { isValidGhostPiece, resolveGhostClears } from "../ghosts";
import { isValidGoldenPiece, resolveGoldenClears } from "../goldenBlocks";
import { applyLineClear, isValidLinePiece } from "../lineBlocks";
import { createRandomSpecialTemplate, createRewardChoices, createSpecialChoices, isValidSpecialPiece, SPECIAL_LABELS, SPECIAL_SUMMARIES } from "../specials";
import { LOCKABLE_BLOCK_IDS } from "../../constants/gameData";
import type { Board } from "../../types";

function emptyBoard(): Board {
  return Array.from({ length: 8 }, () => Array(8).fill(null));
}

describe("special registry", () => {
  it("creates valid special templates", () => {
    for (let i = 0; i < 50; i += 1) {
      const template = createRandomSpecialTemplate();
      expect(isValidSpecialPiece(template)).toBe(true);
    }
  });

  it("rejects non-special pieces", () => {
    expect(isValidSpecialPiece({ id: "single", cells: [[0, 0]] })).toBe(false);
    expect(isValidSpecialPiece(null)).toBe(false);
  });

  it("exposes a label and summary for every special type", () => {
    (["ghost", "line", "echo", "golden", "bomb", "fill", "boost"] as const).forEach((type) => {
      expect(SPECIAL_LABELS[type]).toBeTruthy();
      expect(SPECIAL_SUMMARIES[type]).toBeTruthy();
    });
  });
});

describe("createSpecialChoices", () => {
  it("offers the requested number of valid, distinct-type choices", () => {
    for (let i = 0; i < 20; i += 1) {
      const choices = createSpecialChoices(3);
      expect(choices).toHaveLength(3);
      expect(choices.every((c) => isValidSpecialPiece(c))).toBe(true);
      const types = new Set(choices.map((c) => c.special));
      expect(types.size).toBe(3); // distinct special types
    }
  });

  it("never offers more choices than there are special types", () => {
    expect(createSpecialChoices(99).length).toBe(7);
  });
});

describe("createRewardChoices", () => {
  it("mixes still-locked base shapes with special blocks", () => {
    for (let i = 0; i < 20; i += 1) {
      const choices = createRewardChoices(3, []);
      expect(choices).toHaveLength(3);
      choices.forEach((choice) => {
        expect(isValidSpecialPiece(choice) || LOCKABLE_BLOCK_IDS.includes(choice.id)).toBe(true);
      });
    }
  });

  it("offers only special blocks once every base shape is unlocked", () => {
    createRewardChoices(3, [...LOCKABLE_BLOCK_IDS]).forEach((choice) => {
      expect(isValidSpecialPiece(choice)).toBe(true);
    });
  });
});

describe("special validators", () => {
  it("validate matching specials and reject mismatches", () => {
    expect(isValidGhostPiece({ id: "ghost-x", special: "ghost", cells: [[0, 0]] })).toBe(true);
    expect(isValidGhostPiece({ id: "x", special: "line", cells: [[0, 0]] })).toBe(false);
    expect(isValidLinePiece({ id: "line", special: "line", cells: [[0, 0]] })).toBe(true);
    expect(isValidLinePiece({ id: "line", special: "line", cells: [[0, 0], [0, 1]] })).toBe(true);
    expect(isValidLinePiece({ id: "line", special: "line", cells: "nope" })).toBe(false);
    expect(isValidEchoPiece({ id: "echo", special: "echo", cells: [[0, 0]] })).toBe(true);
    expect(isValidGoldenPiece({ id: "golden-x", special: "golden", cells: [[0, 0]] })).toBe(true);
  });
});

describe("resolveGhostClears", () => {
  it("scores 20 per overlapped cell cleared and keeps the rest marked", () => {
    const result = resolveGhostClears(new Set(["2-2"]), ["3-3"], new Set(["2-2"]));
    expect(result.bonus).toBe(20);
    expect([...result.ghostCells]).toEqual(["3-3"]);
  });

  it("scores nothing when no marked cell is cleared", () => {
    const result = resolveGhostClears(new Set(["2-2"]), [], new Set(["5-5"]));
    expect(result.bonus).toBe(0);
    expect(result.ghostCells.has("2-2")).toBe(true);
  });
});

describe("resolveGoldenClears", () => {
  it("adds the per-cell clear score for each cleared golden cell", () => {
    const cleared = new Set(["0-0", "0-1", "0-2", "0-3"]);
    const result = resolveGoldenClears(new Set(["0-0"]), cleared, 20);
    expect(result.bonus).toBe(5); // 20 / 4 cells × 1 golden cell
    expect(result.goldenCells.size).toBe(0);
  });

  it("is a no-op when no lines scored", () => {
    const result = resolveGoldenClears(new Set(["0-0"]), new Set(), 0);
    expect(result.bonus).toBe(0);
  });
});

describe("resolveBombClears", () => {
  it("does nothing when no bomb cell is cleared", () => {
    const board = emptyBoard();
    board[2][2] = "bomb";
    const result = resolveBombClears(new Set(["2-2"]), new Set(["5-5"]), board);
    expect(result.clearedCells).toHaveLength(0);
    expect(result.bonus).toBe(0);
    expect(result.bombCells.has("2-2")).toBe(true);
  });

  it("wipes the row and column when the bomb cell is cleared", () => {
    const board = emptyBoard();
    board[3][3] = "bomb";
    board[3][0] = "red";
    board[0][3] = "red";
    // The bomb cell (3-3) is among the cells cleared this turn.
    const result = resolveBombClears(new Set(["3-3"]), new Set(["3-3"]), board);
    expect(result.board[3][0]).toBeNull();
    expect(result.board[0][3]).toBeNull();
    expect(result.bonus).toBeGreaterThan(0);
    expect(result.bombCells.size).toBe(0);
  });

  it("chains through a bomb caught in another bomb's blast", () => {
    const board = emptyBoard();
    board[0][0] = "bomb"; // detonates (its cell is cleared)
    board[0][5] = "bomb"; // sits in row 0, caught by the first blast → chains
    board[4][5] = "red";  // only reachable via the second bomb's column
    const result = resolveBombClears(new Set(["0-0", "0-5"]), new Set(["0-0"]), board);
    expect(result.board[4][5]).toBeNull(); // cleared only if the chain fired
    expect(result.bombCells.size).toBe(0);
  });
});

describe("getEchoScore", () => {
  it("scores 5 per filled cell on the board", () => {
    const board = emptyBoard();
    board[0][0] = "red";
    board[1][1] = "red";
    board[2][2] = "red";
    expect(getEchoScore(board)).toBe(15);
  });
});

describe("applyLineClear", () => {
  it("clears the full row and column of a single cell", () => {
    const board = emptyBoard();
    board[2][0] = "red";
    board[2][1] = "red";
    board[0][3] = "red";
    board[2][3] = "line";
    const result = applyLineClear(board, [[2, 3]]);
    expect(result.cleared).toBe(2);
    expect(result.clearedRows).toEqual([2]);
    expect(result.clearedCols).toEqual([3]);
    expect(result.board[2].every((c) => c === null)).toBe(true);
    expect(result.board.every((row) => row[3] === null)).toBe(true);
  });

  it("clears a cross for every cell of a multi-cell line piece", () => {
    const board = emptyBoard();
    board[0][7] = "red";
    board[7][1] = "red";
    // A horizontal duo at (0,0)-(0,1): clears row 0 and columns 0 and 1.
    const result = applyLineClear(board, [[0, 0], [0, 1]]);
    expect(result.clearedRows).toEqual([0]);
    expect(result.clearedCols.sort()).toEqual([0, 1]);
    expect(result.cleared).toBe(3); // 1 row + 2 cols
    expect(result.board[0][7]).toBeNull(); // row 0 wiped
    expect(result.board[7][1]).toBeNull(); // column 1 wiped
  });
});
