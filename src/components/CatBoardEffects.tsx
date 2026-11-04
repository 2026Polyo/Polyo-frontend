import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Board } from "../types";
import type { SpecialPieceGroups } from "../types";
import {
  MAX_EFFECT_BATCHES,
  type BoardFeedback,
} from "../features/themes/boardFeedback";
import {
  CAT_PAW_LIFETIME_MS,
  CAT_PAW_PRESS_MS,
  createCatClearBatch,
  type CatClearBatch,
} from "../features/themes/catFeedback";
import { useReducedMotion } from "../hooks/useReducedMotion";
import CatTile from "./CatTile";

export default function CatBoardEffects({
  feedback,
  board,
  specialPieceGroups,
}: {
  feedback: BoardFeedback | null;
  board: Board;
  specialPieceGroups?: SpecialPieceGroups;
}) {
  const reducedMotion = useReducedMotion();
  const [batches, setBatches] = useState<CatClearBatch[]>([]);
  const active = useRef<
    { batch: CatClearBatch; timer: ReturnType<typeof setTimeout> }[]
  >([]);
  const lastId = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!feedback || reducedMotion) {
      active.current.forEach(({ timer }) => clearTimeout(timer));
      active.current = [];
      lastId.current = feedback?.id ?? null;
      setBatches([]);
      return;
    }
    if (lastId.current === feedback.id) return;
    lastId.current = feedback.id;
    const batch = createCatClearBatch(feedback, board, specialPieceGroups);
    if (!batch.cells.length) return;
    while (active.current.length >= MAX_EFFECT_BATCHES)
      clearTimeout(active.current.shift()!.timer);
    const timer = setTimeout(() => {
      active.current = active.current.filter(
        (item) => item.batch.id !== batch.id,
      );
      setBatches(active.current.map((item) => item.batch));
    }, CAT_PAW_LIFETIME_MS);
    active.current.push({ batch, timer });
    setBatches(active.current.map((item) => item.batch));
  }, [feedback, board, specialPieceGroups, reducedMotion]);
  useLayoutEffect(
    () => () => {
      active.current.forEach(({ timer }) => clearTimeout(timer));
      active.current = [];
      lastId.current = null;
    },
    [],
  );
  if (!batches.length) return null;
  return (
    <span className="cat-board-effects" aria-hidden="true">
      {batches.map((batch) => (
        <span
          className="cat-clear-batch"
          data-effect-id={batch.id}
          key={batch.id}
        >
          {batch.cells.map((cell) => (
            <span
              className="cat-paw-cell"
              data-cell-key={`${cell.row}-${cell.col}`}
              key={`${cell.row}-${cell.col}`}
              style={
                {
                  gridRow: cell.row + 1,
                  gridColumn: cell.col + 1,
                  "--cat-paw-delay": `${cell.delay}ms`,
                  "--cat-paw-duration": `${CAT_PAW_PRESS_MS}ms`,
                } as CSSProperties
              }
            >
              <span className="cat-clear-surface">
                <CatTile
                  joined={cell.joined}
                  color={cell.color}
                  row={cell.row}
                  col={cell.col}
                />
              </span>
              <svg className="cat-paw-print" viewBox="0 0 100 100">
                <g fill="#f1b4cf" stroke="#d792b5" strokeWidth="2">
                  <ellipse
                    cx="22"
                    cy="38"
                    rx="10"
                    ry="14"
                    transform="rotate(-25 22 38)"
                  />
                  <ellipse
                    cx="41"
                    cy="23"
                    rx="10"
                    ry="14"
                    transform="rotate(-8 41 23)"
                  />
                  <ellipse
                    cx="62"
                    cy="23"
                    rx="10"
                    ry="14"
                    transform="rotate(8 62 23)"
                  />
                  <ellipse
                    cx="81"
                    cy="38"
                    rx="10"
                    ry="14"
                    transform="rotate(25 81 38)"
                  />
                  <path d="M27 66q4-9 11-16q13-15 26 0q7 7 11 16q8 20-11 18q-13-5-26 0q-19 2-11-18z" />
                </g>
                <path
                  d="M40 61q8-12 15-6"
                  fill="none"
                  stroke="#ffe6f1"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}
