import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import BoardView from "../../components/Board";
import PieceShape from "../../components/PieceShape";
import { ThemeScope } from "../../components/ThemeScope";
import { getCatConnections } from "../themes/catConnections";
import { getGameTheme } from "../themes/gameThemes";
import type { Board, PieceInstance } from "../../types";

const makeBoard = (): Board =>
  Array.from({ length: 8 }, () => Array(8).fill(null));
const piece: PieceInstance = {
  id: "square-2x2",
  uid: "cat-test",
  color: "cyan",
  cells: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ],
};
function renderBoard(board: Board, clearing = new Set<string>(), previewClearing = new Set<string>()) {
  return renderToStaticMarkup(
    <ThemeScope themeId="theme_cat">
      <BoardView
        board={board}
        boardRef={{ current: null }}
        clearingCells={clearing}
        hoverCell={null}
        onCellClick={() => {}}
        onCellEnter={() => {}}
        onCellLeave={() => {}}
        previewCells={new Set()}
        previewClearingCells={previewClearing}
        selectedPiece={null}
      />
    </ThemeScope>,
  );
}
function joinedAt(markup: string, key: string) {
  return markup
    .split(`data-cell-key="${key}"`)[1]
    .split("</button>")[0]
    .match(/data-joined="([^"]*)"/)?.[1];
}
describe("cat connected surfaces", () => {
  it("marks each preview cell once and skips cells already clearing", () => {
    const cells = new Set<string>();
    for (let index = 0; index < 8; index++) {
      cells.add(`2-${index}`);
      cells.add(`${index}-3`);
    }
    const markup = renderBoard(makeBoard(), new Set(["2-0"]), cells);
    expect(markup.match(/class="cat-clear-preview-paw"/g)).toHaveLength(14);
    expect(markup).not.toContain('style="grid-row:3;grid-column:1"');
    expect(renderBoard(makeBoard())).not.toContain("cat-clear-preview");
  });
  it("connects all four occupied sides across different colours but never diagonals", () => {
    const board = makeBoard();
    board[3][3] = "cyan";
    for (const [r, c] of [
      [2, 3],
      [3, 4],
      [4, 3],
      [3, 2],
    ])
      board[r][c] = "pink";
    expect(getCatConnections((r, c) => Boolean(board[r]?.[c]), 3, 3)).toBe(
      "top right bottom left",
    );
    expect(getCatConnections((r, c) => Boolean(board[r]?.[c]), 0, 0)).toBe("");
    const diagonal = makeBoard();
    diagonal[1][1] = "cyan";
    diagonal[2][2] = "pink";
    expect(joinedAt(renderBoard(diagonal), "1-1")).toBe("");
  });
  it("reopens only the exposed edges when a neighbouring cell clears and preserves saved colour data", () => {
    const board = makeBoard();
    board[2][2] = "cyan";
    board[2][3] = "rose";
    board[3][2] = "lime";
    const before = structuredClone(board);
    expect(joinedAt(renderBoard(board), "2-2")).toBe("right bottom");
    expect(joinedAt(renderBoard(board, new Set(["2-3"])), "2-2")).toBe(
      "bottom",
    );
    board[2][3] = null;
    expect(joinedAt(renderBoard(board), "2-2")).toBe("bottom");
    expect(board[2][2]).toBe(before[2][2]);
  });
  it("joins square tray cells without merging diagonal disconnected pieces", () => {
    const markup = renderToStaticMarkup(
      <ThemeScope themeId="theme_cat">
        <PieceShape piece={piece} />
      </ThemeScope>,
    );
    expect(markup).toContain('data-joined="right bottom"');
    expect(markup).toContain('data-joined="top left"');
    expect(markup.match(/class="cat-tile-face"/g)).toHaveLength(4);
    const classic = renderToStaticMarkup(
      <ThemeScope themeId="theme_classic">
        <PieceShape piece={piece} />
      </ThemeScope>,
    );
    expect(classic).not.toContain("cat-tile-face");
    expect(new Set(Object.values(getGameTheme("theme_cat").palette))).toEqual(
      new Set(["#ffffff"]),
    );
    expect(getGameTheme("theme_cat").soundMode).toBe("custom");
  });
});
