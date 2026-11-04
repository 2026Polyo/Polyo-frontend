import { uniqueFeedbackCells, type BoardFeedback } from "./boardFeedback";
import { getCatConnections } from "./catConnections";
import type { Board } from "../../types";

export const CAT_PAW_PRESS_MS = 460;
export const CAT_PAW_STAGGER_MS = 40;
export const CAT_PAW_MAX_STAGGER_MS = 280;
export const CAT_PAW_LIFETIME_MS =
  CAT_PAW_PRESS_MS + CAT_PAW_MAX_STAGGER_MS + 60;

/** Snapshot only occupied removed cells, in upper-left row order. Never changes game clearing time. */
export function createCatClearBatch(feedback: BoardFeedback, board: Board) {
  const cells = uniqueFeedbackCells(feedback.cleared)
    .filter(({ row, col }) => Boolean(board[row]?.[col]))
    .sort((a, b) => a.row - b.row || a.col - b.col);
  const step = Math.min(
    CAT_PAW_STAGGER_MS,
    CAT_PAW_MAX_STAGGER_MS / Math.max(1, cells.length - 1),
  );
  return {
    id: feedback.id,
    cells: cells.map((cell, index) => ({
      ...cell,
      delay: index * step,
      joined: getCatConnections(
        (r, c) => Boolean(board[r]?.[c]),
        cell.row,
        cell.col,
      ),
    })),
  };
}
export type CatClearBatch = ReturnType<typeof createCatClearBatch>;
