import { applySpreadClear, clearLines, cloneBoard, countAdjacentBlocks, isBoardEmpty } from "../utils/boardUtils";
import { getSpreadFillCells, getSurroundingEmptyCells, placePiece } from "../utils/placement";
import { getAugmentedScore, rollSpreadClear, rollSpreadFill } from "./augments";
import { resolveBombClears } from "./bombBlocks";
import { getBoostMultiplier } from "./boostBlocks";
import { getEchoScore } from "./echoBlocks";
import { resolveGhostClears } from "./ghosts";
import { resolveGoldenClears } from "./goldenBlocks";
import { applyLineClear } from "./lineBlocks";
import type { AugmentState, Board, CellCoord, PieceInstance } from "../types";

export interface ResolvePlacementInput {
  augmentState: AugmentState;
  board: Board;
  bombCells: Set<string>;
  boostCells: Set<string>;
  col: number;
  ghostCells: Set<string>;
  goldenCells: Set<string>;
  piece: PieceInstance;
  row: number;
  /** Preview mode: skip the random spread augments so the result is deterministic. */
  preview?: boolean;
}

export interface PlacementOutcome {
  /** Bomb marks remaining (plus any laid by a bomb piece, minus any detonated this turn). */
  bombCells: Set<string>;
  /** Boost marks remaining (plus any laid by a boost piece, minus any cleared this turn). */
  boostCells: Set<string>;
  /** Number of lines cleared this placement (used for combo/sound/augment state). */
  cleared: number;
  /** Cells to flash as "clearing" before the board settles. */
  clearingCells: Set<string>;
  /** Board to render immediately (pre-clear while the highlight animates). */
  displayBoard: Board;
  /** Extra cells filled by the spread-fill augment (for the placement score). */
  extraCells: number;
  /** Ghost marks remaining after this placement. */
  ghostCells: Set<string>;
  /** Golden marks remaining (plus any laid by a golden piece this turn). */
  goldenCells: Set<string>;
  /** Total score gained, including line/combo/ghost/golden/echo/bomb bonuses and the boost multiplier. */
  scoreGain: number;
  /** Board after the clear highlight finishes. */
  settledBoard: Board;
}

// Pure resolution of a single placement: applies the piece, special-block effects, the
// spread augments, scoring, and ghost/golden bookkeeping. No React or audio side effects,
// so the full scoring pipeline can be unit-tested.
export function resolvePlacement({
  augmentState,
  board,
  bombCells,
  boostCells,
  col,
  ghostCells,
  goldenCells,
  piece,
  row,
  preview = false
}: ResolvePlacementInput): PlacementOutcome {
  const echoBonus = piece.special === "echo" ? getEchoScore(board) : 0;

  let result = placePiece(board, piece, row, col);
  const newOverlapCells = piece.special === "ghost" ? result.overlappedCells : [];
  let extraCells = 0;

  if (piece.special === "line") {
    const lineCells = piece.cells.map(([dr, dc]) => [row + dr, col + dc] as CellCoord);
    result = { ...applyLineClear(result.placedBoard, lineCells), placedBoard: result.placedBoard, overlappedCells: [] };
  } else if (piece.special === "fill") {
    // Fill every empty cell within one step of the placed block, then resolve clears.
    const fillCells = getSurroundingEmptyCells(result.placedBoard, piece, row, col);
    if (fillCells.length) {
      extraCells = fillCells.length;
      const filledBoard = cloneBoard(result.placedBoard);
      fillCells.forEach(({ row: r, col: c }) => { filledBoard[r][c] = piece.color; });
      result = { ...clearLines(filledBoard), placedBoard: filledBoard, overlappedCells: [] };
    }
  } else {
    const spreadCount = preview ? 0 : rollSpreadFill(augmentState);
    if (spreadCount > 0) {
      const spreadCells = getSpreadFillCells(result.placedBoard, piece, row, col, spreadCount);
      if (spreadCells.length) {
        extraCells = spreadCells.length;
        const spreadBoard = cloneBoard(result.placedBoard);
        spreadCells.forEach(({ row: r, col: c }) => { spreadBoard[r][c] = piece.color; });
        result = { ...clearLines(spreadBoard), placedBoard: spreadBoard, overlappedCells: [] };
      }
    }
  }

  result = {
    ...applySpreadClear(result, preview ? 0 : rollSpreadClear(augmentState)),
    placedBoard: result.placedBoard,
    overlappedCells: result.overlappedCells
  };

  const cellKeys = (special: PieceInstance["special"]) =>
    piece.special === special ? piece.cells.map(([dr, dc]) => `${row + dr}-${col + dc}`) : [];
  const newGoldenCells = cellKeys("golden");
  const newBombCells = cellKeys("bomb");
  const newBoostCells = cellKeys("boost");

  const totalCells = board.length * (board[0]?.length ?? board.length);
  const filledCells = board.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  const boardFillRatio = totalCells > 0 ? filledCells / totalCells : 0;

  const clearingCells = new Set(result.clearedCells);
  const crackCount = countAdjacentBlocks(result.placedBoard, result.clearedRows, result.clearedCols);
  const scoreBreakdown = getAugmentedScore({
    augmentState, cleared: result.cleared, piece,
    allClear: isBoardEmpty(result.board), extraCells, boardFillRatio,
    clearedCellCount: result.clearedCells.length, crackCount
  });
  const ghostResult = resolveGhostClears(ghostCells, newOverlapCells, clearingCells);
  const goldenResult = resolveGoldenClears(goldenCells, clearingCells, scoreBreakdown.clearScore);

  const nextGolden = new Set(goldenResult.goldenCells);
  newGoldenCells.forEach((key) => nextGolden.add(key));

  // A bomb detonates when its own cell is cleared this turn (including one just placed that
  // completes a line). Detonations wipe the bomb's row/column and chain through other bombs.
  const allBombCells = new Set(bombCells);
  newBombCells.forEach((key) => allBombCells.add(key));
  const bombResult = resolveBombClears(allBombCells, clearingCells, result.board);
  bombResult.clearedCells.forEach((key) => clearingCells.add(key));

  // Boost blocks already on the board (at the start of this move) multiply the score gained.
  // Cleared boost cells drop out; newly placed ones (that survive this turn) start next move.
  const rawGain = scoreBreakdown.total + ghostResult.bonus + goldenResult.bonus + echoBonus + bombResult.bonus;
  const scoreGain = Math.round(rawGain * getBoostMultiplier(boostCells.size));

  const nextBoost = new Set<string>();
  boostCells.forEach((key) => { if (!clearingCells.has(key)) nextBoost.add(key); });
  newBoostCells.forEach((key) => { if (!clearingCells.has(key)) nextBoost.add(key); });

  return {
    bombCells: bombResult.bombCells,
    boostCells: nextBoost,
    cleared: result.cleared,
    clearingCells,
    displayBoard: clearingCells.size ? result.placedBoard : result.board,
    extraCells,
    ghostCells: ghostResult.ghostCells,
    goldenCells: nextGolden,
    scoreGain,
    settledBoard: bombResult.board
  };
}
