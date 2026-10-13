import type { CellCoord, PieceTemplate, SpecialType } from "../types";

// Builds a type guard for a special-block template. Every special validator shares the
// same envelope checks (object, matching `special`, string id, cells array); only the
// per-special cell-shape predicate differs.
export function makeSpecialValidator<T extends PieceTemplate>(
  special: SpecialType,
  cellsValid: (cells: CellCoord[]) => boolean
) {
  return (piece: unknown): piece is T => {
    if (piece === null || typeof piece !== "object") return false;
    const template = piece as PieceTemplate;
    return (
      template.special === special &&
      typeof template.id === "string" &&
      Array.isArray(template.cells) &&
      cellsValid(template.cells)
    );
  };
}

/** Every cell is a valid [row, col] coordinate pair. */
export const cellsAreCoordPairs = (cells: CellCoord[]): boolean =>
  cells.every((cell) => Array.isArray(cell) && cell.length === 2);
