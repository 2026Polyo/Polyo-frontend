import { SIZE } from "../constants/gameData";
import type { BoardMetrics, PlacementPosition, PointerPoint } from "../types";

export interface BoardPointerGrid extends BoardMetrics {
  left: number;
  top: number;
}

/** Coordinates are in viewport pixels, measured from the first board cell. */
export function getBoardCellFromPoint(point: PointerPoint, grid: BoardPointerGrid): PlacementPosition | null {
  const { cellSize, cellGap, left, top } = grid;
  if (cellSize <= 0) return null;
  const extent = SIZE * cellSize + (SIZE - 1) * cellGap;
  const x = point.x - left;
  const y = point.y - top;
  if (x < 0 || y < 0 || x >= extent || y >= extent) return null;
  const pitch = cellSize + cellGap;
  return {
    row: Math.min(SIZE - 1, Math.round((y - cellSize / 2) / pitch)),
    col: Math.min(SIZE - 1, Math.round((x - cellSize / 2) / pitch))
  };
}

/** Keep the grabbed cell above the finger; hit testing uses this same point. */
export function getDragPreviewPoint(point: PointerPoint, pointerType: string): PointerPoint {
  return { x: point.x, y: point.y - (pointerType === "touch" ? 56 : 0) };
}
