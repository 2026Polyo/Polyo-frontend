import { describe, expect, it } from "vitest";
import { getBoardCellFromPoint, getDragPreviewPoint } from "../pointerPlacement";

describe("pointer placement geometry", () => {
  const grid = { left: 17, top: 73, cellSize: 34, cellGap: 2 };

  it("finds every cell after the board has moved or resized", () => {
    for (const metrics of [grid, { left: 23.5, top: 102.25, cellSize: 41.75, cellGap: 3 }]) {
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const pitch = metrics.cellSize + metrics.cellGap;
          expect(getBoardCellFromPoint({
            x: metrics.left + col * pitch + metrics.cellSize / 2,
            y: metrics.top + row * pitch + metrics.cellSize / 2
          }, metrics)).toEqual({ row, col });
        }
      }
    }
  });

  it("does not snap a release outside the board onto an edge cell", () => {
    for (const point of [{ x: 16.9, y: 90 }, { x: 303, y: 90 }, { x: 30, y: 72.9 }, { x: 30, y: 359 }]) {
      expect(getBoardCellFromPoint(point, grid)).toBeNull();
    }
    expect(getBoardCellFromPoint({ x: 302.9, y: 358.9 }, grid)).toEqual({ row: 7, col: 7 });
  });

  it("uses the lifted touch preview for both the visible cell and final drop", () => {
    const finger = { x: 34, y: 146 };
    expect(getBoardCellFromPoint(getDragPreviewPoint(finger, "touch"), grid)).toEqual({ row: 0, col: 0 });
    expect(getBoardCellFromPoint(getDragPreviewPoint(finger, "mouse"), grid)).toEqual({ row: 2, col: 0 });
  });

  it("maps a gap to the closest cell and rejects an unmeasured board", () => {
    expect(getBoardCellFromPoint({ x: 51.5, y: 90 }, grid)).toEqual({ row: 0, col: 0 });
    expect(getBoardCellFromPoint({ x: 52.5, y: 90 }, grid)).toEqual({ row: 0, col: 1 });
    expect(getBoardCellFromPoint({ x: 34, y: 90 }, { ...grid, cellSize: 0 })).toBeNull();
  });
});
