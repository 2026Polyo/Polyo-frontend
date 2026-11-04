import { useLayoutEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  getCatRegions,
  getCatExpression,
  hashCatIdentity,
  type CatCell,
  type CatRegion,
  type CatExpression as Expression,
} from "../features/themes/catRegions";
import CatExpression from "./CatExpression";
import "../styles/CatTheme.css";
import { useReducedMotion } from "../hooks/useReducedMotion";
import {
  catConnectionGroup,
  getCatCoatStyle,
} from "../features/themes/specialAppearance";
import type { Board, SpecialPieceGroups } from "../types";

interface Decoration {
  color?: string | null;
  region: CatRegion;
  key: string;
  expression: Expression;
  phase: "rest" | "enter" | "exit";
}
const SQUISH_LIFETIME_MS = 520;

function createFaceSeed() {
  return globalThis.crypto?.getRandomValues?.(new Uint32Array(1))[0] ?? 731;
}
export default function CatDecorations({
  cells,
  rows,
  cols,
  identity,
  board,
  specialPieceGroups,
  color,
}: {
  cells: readonly CatCell[];
  rows: number;
  cols: number;
  identity?: string;
  board?: Board;
  specialPieceGroups?: SpecialPieceGroups;
  color?: string;
}) {
  const [localSeed] = useState(() =>
    identity === undefined ? createFaceSeed() : 0,
  );
  const seed = identity === undefined ? localSeed : hashCatIdentity(identity);
  const regions = useMemo(
    () =>
      getCatRegions(
        cells,
        board
          ? (r, c) => catConnectionGroup(board, specialPieceGroups ?? {}, r, c)
          : undefined,
      ),
    [cells, board, specialPieceGroups],
  );
  const reducedMotion = useReducedMotion();
  const desired = useMemo<Decoration[]>(
    () =>
      regions.map((region) => ({
        region,
        color: color ?? board?.[region.cells[0][0]]?.[region.cells[0][1]],
        key: `${seed}:${color ?? board?.[region.cells[0][0]]?.[region.cells[0][1]] ?? "normal"}:${region.cells.map(([r, c]) => `${r},${c}`).join(";")}`,
        expression: getCatExpression(region.id, seed),
        phase: "rest",
      })),
    [regions, seed, color, board],
  );
  const [decorations, setDecorations] = useState<Decoration[]>(() =>
    desired.map((item) => ({ ...item, phase: "enter" })),
  );
  useLayoutEffect(() => {
    if (reducedMotion) {
      setDecorations(desired);
      return;
    }
    setDecorations((previous) => {
      // Retain only one outgoing generation during rapid placements; no unbounded ghosts.
      const visible = previous.filter((item) => item.phase !== "exit");
      const nextKeys = new Set(desired.map((item) => item.key));
      const oldByKey = new Map(visible.map((item) => [item.key, item]));
      return [
        ...visible
          .filter((item) => !nextKeys.has(item.key))
          .map((item) => ({ ...item, phase: "exit" as const })),
        ...desired.map(
          (item) =>
            oldByKey.get(item.key) ?? { ...item, phase: "enter" as const },
        ),
      ];
    });
    const timer = setTimeout(() => setDecorations(desired), SQUISH_LIFETIME_MS);
    return () => clearTimeout(timer);
  }, [desired, reducedMotion]);
  return (
    <span
      className="cat-decoration-layer"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0,1fr))`,
      }}
      aria-hidden="true"
    >
      {decorations.map(
        ({ region, key, expression, phase, color: coatColor }) => {
          const r = Math.floor(region.face.row),
            c = Math.floor(region.face.col);
          const dx = region.face.col - c,
            dy = region.face.row - r;
          return (
            <span
              className="cat-region-decoration"
              data-cat-region={region.id}
              data-cat-phase={phase}
              key={key}
              style={getCatCoatStyle(coatColor)}
            >
              <span
                className="cat-face-slot"
                style={
                  {
                    gridRow: r + 1,
                    gridColumn: c + 1,
                    "--cat-face-x": `calc(${dx * 100}% + var(--cat-gap) * ${dx - 0.5})`,
                    "--cat-face-y": `calc(${dy * 100}% + var(--cat-gap) * ${dy - 0.5})`,
                  } as CSSProperties
                }
              >
                <CatExpression expression={expression} />
              </span>
              {region.ears.map(([row, col], index) => (
                <span
                  className={`cat-ear-slot cat-ear-${index ? "right" : "left"}`}
                  style={{ gridRow: row + 1, gridColumn: col + 1 }}
                  key={index}
                >
                  <svg
                    viewBox="0 0 32 28"
                    className="cat-ear"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 26L7 4Q8 0 12 3L30 26"
                      fill="var(--cat-coat-color, #fff)"
                      stroke="var(--cat-coat-edge, #ad98c3)"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path d="M8 21l2-12q0-1 2 1l11 12z" fill="#f5c0d5" />
                  </svg>
                </span>
              ))}
            </span>
          );
        },
      )}
    </span>
  );
}
