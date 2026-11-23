import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CatExpression } from "../../components/theme";
import {
  createCatClearBatch,
  getCatFlightKeyframes,
  CAT_PAW_LIFETIME_MS,
  CAT_PAW_MAX_STAGGER_MS,
  CAT_PAW_PRESS_MS,
} from "../themes/catFeedback";
import type { Board } from "../../types";

const board: Board = Array.from({ length: 8 }, () => Array(8).fill("cyan"));
describe("cat paw clear", () => {
  it("compresses on contact, then lifts, turns and falls", () => {
    const frames = getCatFlightKeyframes(
      {
        x: 1,
        y: 0,
        duration: 800,
        depth: 0.75,
        pitch: 150,
        roll: -120,
      },
      360,
    );
    const translation = (frame: Keyframe) =>
      String(frame.transform)
        .match(/translate3d\(([^)]*)\)/)![1]
        .split(", ")
        .map(parseFloat);

    expect(frames[1].transform).toContain("scale(1.06, .78)");
    expect(translation(frames[1])).toEqual([0, 0, 0]);
    expect(translation(frames[6])[1]).toBeLessThan(0);
    expect(translation(frames[6])[2]).toBeGreaterThan(0);
    const lastFrame = frames[frames.length - 1];
    expect(translation(lastFrame)[1]).toBeGreaterThan(0);
    expect(lastFrame.transform).toContain("rotateZ(-120deg)");
  });
  it("triggers the large paw from three cleared lines, independent of tile count", () => {
    const feedback = {
      id: 1,
      placed: [],
      cleared: [{ row: 0, col: 0, color: "cyan" }],
    };
    for (const clearedLines of [0, 1, 2, 3, 4]) {
      expect(
        createCatClearBatch({ ...feedback, clearedLines }, board).slam,
      ).toBe(clearedLines >= 3);
    }
  });
  it("orders removed cells from upper-left and never spawns paws from empty or duplicate cells", () => {
    const grid = board.map((row) => [...row]);
    grid[1][1] = null;
    const feedback = {
      id: 1,
      placed: [],
      cleared: [
        { row: 3, col: 0, color: "pink" },
        { row: 0, col: 7, color: "cyan" },
        { row: 0, col: 0, color: "cyan" },
        { row: 0, col: 0, color: "cyan" },
        { row: 1, col: 1, color: "cyan" },
        { row: 88, col: 0, color: "cyan" },
      ],
    };
    const original = structuredClone(feedback);
    const batch = createCatClearBatch(feedback, grid);
    expect(batch.cells.map((cell) => `${cell.row}-${cell.col}`)).toEqual([
      "0-0",
      "0-7",
      "3-0",
    ]);
    expect(batch.cells.map((cell) => cell.delay)).toEqual([0, 40, 80]);
    expect(batch.cells[0].joined).toBe("right bottom");
    expect(feedback).toEqual(original);
  });
  it("bounds a full-board wave and gives later tiles later disappearance times", () => {
    const batch = createCatClearBatch(
      {
        id: 2,
        placed: [],
        cleared: board.flatMap((row, r) =>
          row.map((color, c) => ({ row: r, col: c, color: color! })),
        ),
      },
      board,
    );
    expect(batch.cells).toHaveLength(64);
    expect(batch.cells[0].delay).toBe(0);
    expect(batch.cells[63].delay).toBe(CAT_PAW_MAX_STAGGER_MS);
    for (let i = 0; i < batch.cells.length; i++) {
      expect(batch.cells[i].delay + CAT_PAW_PRESS_MS).toBeLessThan(
        CAT_PAW_LIFETIME_MS,
      );
      if (i)
        expect(batch.cells[i].delay).toBeGreaterThan(batch.cells[i - 1].delay);
    }
    expect(
      createCatClearBatch({ id: 3, placed: [], cleared: [] }, board).cells,
    ).toEqual([]);
  });
  it("renders the three additional reference moods as separate original vector expressions", () => {
    for (const expression of ["wonder", "happy", "grin"] as const) {
      const markup = renderToStaticMarkup(
        <CatExpression expression={expression} />,
      );
      expect(markup).toContain(`data-expression="${expression}"`);
      expect(markup).not.toContain("<image");
    }
  });
});
