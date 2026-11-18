import { SPECIAL_COLORS } from "../../constants/gameData";
import type {
  Board,
  PieceInstance,
  SpecialPieceGroups,
  SpecialType,
} from "../../types";
import type { CSSProperties } from "react";

export function getSpecialAppearance(
  color?: string | null,
): SpecialType | undefined {
  return color && SPECIAL_COLORS.has(color)
    ? (color as SpecialType)
    : undefined;
}

/** Seamless 64-unit vector tiles. No face-sized patches that restart at each board cell. */
function furPattern(
  ink: string,
  kind: "stripe" | "fleck" | "calico",
  opacity: number,
): string {
  const marks =
    kind === "stripe"
      ? [-16, 16, 48, 80]
          .map((x) => `<path d="M${x} 0c10 12 10 20 0 32s-10 20 0 32"/>`)
          .join("")
      : kind === "calico"
        ? '<path d="M8 9c7-8 19-6 22 3s-5 19-14 17S0 18 8 9z"/><path fill="#786c69" d="M43 39c9-4 18 3 16 11s-16 11-21 3-2-10 5-14z"/>'
        : '<path d="M11 10q7-5 10 2t-10 5q-5-4 0-7zM45 39q8-5 9 3t-10 5q-4-5 1-8z"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g ${kind === "stripe" ? `fill="none" stroke="${ink}" stroke-width="6"` : `fill="${ink}"`} opacity="${opacity}">${marks}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const CAT_COATS: Record<
  SpecialType,
  { color: string; edge: string; pattern: string; dark?: boolean }
> = {
  ghost: {
    color: "#dce3ec",
    edge: "#a9b4c3bb",
    pattern: furPattern("#9aaab8", "stripe", 0.19),
  },
  line: {
    color: "#f4c68d",
    edge: "#c49e76bb",
    pattern: furPattern("#b77a46", "stripe", 0.21),
  },
  echo: {
    color: "#9fadc1",
    edge: "#8696adbb",
    pattern: furPattern("#f0f2f1", "fleck", 0.23),
  },
  golden: {
    color: "#f4dfab",
    edge: "#c6b087bb",
    pattern: furPattern("#d5b36b", "fleck", 0.22),
  },
  bomb: {
    color: "#655e6c",
    edge: "#8c8194aa",
    pattern: furPattern("#b5acbf", "stripe", 0.17),
    dark: true,
  },
  fill: {
    color: "#fff1d9",
    edge: "#c7b4a2bb",
    pattern: furPattern("#c48b55", "calico", 0.35),
  },
  boost: {
    color: "#b58a71",
    edge: "#a07e69bb",
    pattern: furPattern("#6f4b3e", "stripe", 0.22),
  },
};

export function getCatCoatStyle(
  color?: string | null,
): CSSProperties | undefined {
  const special = getSpecialAppearance(color);
  if (!special) return undefined;
  const coat = CAT_COATS[special];
  return {
    "--cat-coat-color": coat.color,
    "--cat-coat-edge": coat.edge,
    "--cat-coat-pattern": coat.pattern,
    "--cat-ink": coat.dark ? "#fff2f5" : "#39323f",
    "--cat-shine": coat.dark ? "#655e6c" : "#ffffff",
    "--cat-stripes": coat.dark ? "#aaa0b5" : "#8c7c7e88",
  } as CSSProperties;
}

export function catConnectionGroup(
  board: Board,
  groups: Readonly<SpecialPieceGroups>,
  row: number,
  col: number,
): string {
  const color = board[row]?.[col];
  if (!color) return "";
  if (!getSpecialAppearance(color)) return "normal";
  const key = `${row}-${col}`;
  return `special:${color}:${Object.prototype.hasOwnProperty.call(groups, key) ? groups[key] : `legacy-${key}`}`;
}

/** Old saves have no piece origins: keep those cells isolated rather than merge unrelated cats. */
export function normalizeSpecialPieceGroups(
  board: Board,
  raw: unknown,
): SpecialPieceGroups {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const groups: SpecialPieceGroups = {};
  board.forEach((line, r) =>
    line.forEach((color, c) => {
      if (!getSpecialAppearance(color)) return;
      const key = `${r}-${c}`;
      const id = Object.prototype.hasOwnProperty.call(source, key)
        ? source[key]
        : undefined;
      groups[key] =
        typeof id === "string" && id.length > 0 && id.length <= 200
          ? id
          : `legacy-${key}`;
    }),
  );
  return groups;
}

export function placeSpecialPieceGroups(
  previousBoard: Board,
  previousGroups: SpecialPieceGroups,
  piece: PieceInstance,
  row: number,
  col: number,
  nextBoard: Board,
): SpecialPieceGroups {
  const groups = normalizeSpecialPieceGroups(nextBoard, previousGroups);
  const placed = new Set(piece.cells.map(([r, c]) => `${row + r}-${col + c}`));
  if (getSpecialAppearance(piece.color))
    nextBoard.forEach((line, r) =>
      line.forEach((color, c) => {
        const key = `${r}-${c}`;
        if (
          color === piece.color &&
          (placed.has(key) || previousBoard[r]?.[c] !== color)
        )
          groups[key] = piece.uid;
      }),
    );
  return groups;
}

export function moveSpecialPieceGroups(
  groups: SpecialPieceGroups,
  moved: ReadonlyMap<string, string>,
): SpecialPieceGroups {
  return Object.fromEntries(
    Object.entries(groups).flatMap(([key, id]) =>
      moved.has(key) ? [[moved.get(key)!, id]] : [],
    ),
  );
}
