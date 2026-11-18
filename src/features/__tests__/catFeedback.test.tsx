import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CatExpression from "../../components/CatExpression";
import {
  createCatClearBatch,
  CAT_PAW_LIFETIME_MS,
  CAT_PAW_MAX_STAGGER_MS,
  CAT_PAW_PRESS_MS,
} from "../themes/catFeedback";
import type { Board } from "../../types";

const board: Board = Array.from({ length: 8 }, () => Array(8).fill("cyan"));
describe("cat paw clear", () => {
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
