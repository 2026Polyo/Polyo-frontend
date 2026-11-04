import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialAugmentState } from "../augments";
import { createBonusTimeState } from "../bonusTime";
import { loadSavedGame, saveCurrentGame } from "../savedGame";
import { getSavedItemState } from "../items";
import { isValidBoard, isValidTray } from "../savedGame";
import { simulateGravity } from "../../utils/boardUtils";
import { getCatRegions } from "../themes/catRegions";
import {
  catConnectionGroup,
  getCatCoatStyle,
  getSpecialAppearance,
  normalizeSpecialPieceGroups,
  placeSpecialPieceGroups,
  moveSpecialPieceGroups,
} from "../themes/specialAppearance";
import type { Board, PieceInstance, SpecialPieceGroups } from "../../types";

const empty = (): Board => Array.from({ length: 8 }, () => Array(8).fill(null));
const a: PieceInstance = {
  id: "boost-L",
  uid: "owner-a",
  special: "boost",
  color: "boost",
  cells: [
    [0, 0],
    [1, 0],
    [1, 1],
  ],
};
function place(
  board: Board,
  groups: SpecialPieceGroups,
  piece: PieceInstance,
  row: number,
  col: number,
) {
  const next = board.map((line) => [...line]);
  piece.cells.forEach(([r, c]) => {
    next[row + r][col + c] = piece.color;
  });
  return {
    board: next,
    groups: placeSpecialPieceGroups(board, groups, piece, row, col, next),
  };
}
afterEach(() => vi.unstubAllGlobals());
describe("special piece visual identity", () => {
  it("keeps one piece connected and same-kind neighbouring pieces separate, while ordinary cats still merge", () => {
    const first = place(empty(), {}, a, 1, 1);
    const second = place(
      first.board,
      first.groups,
      { ...a, uid: "owner-b" },
      1,
      3,
    );
    const board = second.board;
    board[0][1] = "cyan";
    board[0][2] = "pink";
    const cells = board.flatMap((line, r) =>
      line.flatMap((cell, c) => (cell ? [[r, c] as const] : [])),
    );
    const regions = getCatRegions(cells, (r, c) =>
      catConnectionGroup(board, second.groups, r, c),
    );
    expect(regions.map((region) => region.cells.length).sort()).toEqual([
      2, 3, 3,
    ]);
    expect(catConnectionGroup(board, second.groups, 2, 1)).toBe(
      catConnectionGroup(board, second.groups, 2, 2),
    );
    expect(catConnectionGroup(board, second.groups, 2, 2)).not.toBe(
      catConnectionGroup(board, second.groups, 2, 3),
    );
  });
  it("assigns new owners on ghost overlap and fill expansion and removes cleared ownership", () => {
    const first = place(empty(), {}, a, 1, 1);
    const ghost = {
      ...a,
      special: "ghost" as const,
      color: "ghost",
      uid: "ghost-a",
    };
    const second = place(first.board, first.groups, ghost, 1, 1);
    expect(new Set(Object.values(second.groups))).toEqual(new Set(["ghost-a"]));
    const fill = {
      ...a,
      special: "fill" as const,
      color: "fill",
      uid: "fill-a",
    };
    const next = empty();
    next[1][1] = "fill";
    next[1][2] = "fill";
    const expanded = placeSpecialPieceGroups(empty(), {}, fill, 1, 1, next);
    expect(expanded).toEqual({ "1-1": "fill-a", "1-2": "fill-a" });
    next[1][1] = null;
    expect(normalizeSpecialPieceGroups(next, expanded)).toEqual({
      "1-2": "fill-a",
    });
  });
  it("falls back safely for legacy or malformed saved groups without joining unrelated special cells", () => {
    const board = empty();
    board[0][0] = "boost";
    board[0][1] = "boost";
    board[1][1] = "cyan";
    const groups = normalizeSpecialPieceGroups(board, {
      "0-0": {},
      "0-1": "",
      "1-1": "not-special",
      "99-99": "outside",
    });
    expect(groups).toEqual({ "0-0": "legacy-0-0", "0-1": "legacy-0-1" });
    expect(catConnectionGroup(board, groups, 0, 0)).not.toBe(
      catConnectionGroup(board, groups, 0, 1),
    );
  });
  it("preserves group IDs at every gravity frame without changing colours or origins", () => {
    const { board, groups } = place(empty(), {}, a, 0, 1);
    const before = structuredClone(board);
    const gravity = simulateGravity(board);
    expect(gravity.frameMoves).toHaveLength(gravity.frames.length);
    gravity.frames.forEach((frame, index) => {
      const moved = moveSpecialPieceGroups(groups, gravity.frameMoves[index]);
      expect(Object.keys(moved)).toHaveLength(3);
      for (const key of Object.keys(moved)) {
        const [r, c] = key.split("-").map(Number);
        expect(frame[r][c]).toBe("boost");
        expect(moved[key]).toBe("owner-a");
      }
    });
    expect(board).toEqual(before);
    expect(
      Object.values(moveSpecialPieceGroups(groups, gravity.moved)),
    ).toEqual(["owner-a", "owner-a", "owner-a"]);
  });
  it("round-trips ownership through game and undo saves and migrates old saves", () => {
    const { board, groups } = place(empty(), {}, a, 1, 1);
    let raw = "";
    vi.stubGlobal("localStorage", {
      getItem: () => raw || null,
      setItem: (_key: string, value: string) => {
        raw = value;
      },
    });
    const augmentState = createInitialAugmentState();
    const undoSnapshot = {
      board,
      augmentState,
      score: 0,
      tray: [null, null, null] as [null, null, null],
      bombCells: [],
      boostCells: [],
      ghostCells: [],
      goldenCells: [],
      specialPieceGroups: groups,
    };
    saveCurrentGame({
      gameMode: "normal",
      bonusTime: createBonusTimeState(),
      board,
      specialPieceGroups: groups,
      augmentState,
      score: 0,
      tray: [null, null, null],
      deck: [],
      bombCells: new Set(),
      boostCells: new Set(),
      ghostCells: new Set(),
      goldenCells: new Set(),
      itemSlots: [null, null, null],
      specialPieces: [],
      specialsGranted: 0,
      undoSnapshot,
    });
    expect(loadSavedGame()?.specialPieceGroups).toEqual(groups);
    expect(loadSavedGame()?.undoSnapshot?.specialPieceGroups).toEqual(groups);
    expect(
      getSavedItemState({ undoSnapshot }, { isValidBoard, isValidTray })
        .undoSnapshot?.specialPieceGroups,
    ).toEqual(groups);
    const old = JSON.parse(raw);
    delete old.specialPieceGroups;
    raw = JSON.stringify(old);
    expect(loadSavedGame()?.specialPieceGroups["1-1"]).toBe("legacy-1-1");
  });
  it("provides seven distinct coats and leaves ordinary cats white", () => {
    const kinds = ["ghost", "line", "echo", "golden", "bomb", "fill", "boost"];
    expect(
      new Set(kinds.map((kind) => JSON.stringify(getCatCoatStyle(kind)))).size,
    ).toBe(7);
    expect(getCatCoatStyle("cyan")).toBeUndefined();
    expect(getSpecialAppearance("constructor")).toBeUndefined();
  });
});
