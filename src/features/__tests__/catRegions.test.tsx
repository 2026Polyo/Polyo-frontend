import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getCatRegions,
  getCatExpression,
  CAT_EXPRESSIONS,
} from "../themes/catRegions";
import type { CatCell } from "../themes/catRegions";
import CatDecorations from "../../components/CatDecorations";

describe("connected cat decorations", () => {
  it("gives each orthogonal region one face and two ears, excluding diagonal contacts", () => {
    const cells: CatCell[] = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 2],
    ];
    const before = structuredClone(cells);
    const groups = getCatRegions(cells);
    expect(groups).toHaveLength(2);
    expect(groups[0].face).toEqual({ row: 1, col: 1 });
    expect(groups[0].ears).toEqual([
      [0, 0],
      [0, 1],
    ]);
    const markup = renderToStaticMarkup(
      <CatDecorations cells={cells} rows={8} cols={8} identity="test" />,
    );
    expect(markup.match(/class="cat-expression"/g)).toHaveLength(2);
    expect(markup.match(/class="cat-ear"/g)).toHaveLength(4);
    expect(cells).toEqual(before);
  });
  it("merges and splits decorations as the occupied shape changes", () => {
    expect(
      getCatRegions([
        [0, 0],
        [0, 2],
      ]),
    ).toHaveLength(2);
    expect(
      getCatRegions([
        [0, 0],
        [0, 1],
        [0, 2],
      ]),
    ).toHaveLength(1);
    expect(
      getCatRegions([
        [0, 0],
        [0, 2],
      ]),
    ).toHaveLength(2);
    expect(getCatRegions([])).toEqual([]);
  });
  it("keeps face footprints on white cells for concave L shapes and rings", () => {
    for (const cells of [
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [2, 1],
        [2, 2],
      ],
      [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 0],
        [1, 2],
        [2, 0],
        [2, 1],
        [2, 2],
      ],
    ] as CatCell[][]) {
      const occupied = new Set(cells.map(([r, c]) => `${r},${c}`));
      const { face } = getCatRegions(cells)[0];
      for (const dy of [-0.4, 0, 0.4])
        for (const dx of [-0.4, 0, 0.4])
          expect(
            occupied.has(
              `${Math.floor(face.row + dy)},${Math.floor(face.col + dx)}`,
            ),
          ).toBe(true);
    }
  });
  it("handles a full field, duplicate cells and disconnected special shapes", () => {
    const all: CatCell[] = Array.from({ length: 64 }, (_, i) => [
      Math.floor(i / 8),
      i % 8,
    ]);
    const groups = getCatRegions([...all, [0, 0]]);
    expect(groups).toHaveLength(1);
    expect(groups[0].cells).toHaveLength(64);
    expect(groups[0].face).toEqual({ row: 4, col: 4 });
    expect(
      getCatRegions([
        [0, 0],
        [1, 1],
        [2, 2],
      ]),
    ).toHaveLength(3);
  });
  it("provides all eight moods, stable across rerenders without gameplay randomness", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw Error("game RNG consumed");
    });
    try {
      expect(getCatExpression("0-0", 123)).toBe(getCatExpression("0-0", 123));
      const moods = new Set(
        Array.from({ length: 100 }, (_, seed) => getCatExpression("0-0", seed)),
      );
      expect(moods).toEqual(new Set(CAT_EXPRESSIONS));
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });
});
