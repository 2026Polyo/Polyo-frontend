import { memo, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Board } from "../../types";
import type { SpecialPieceGroups } from "../../types";
import {
  MAX_EFFECT_BATCHES,
  type BoardFeedback,
} from "../../features/themes/boardFeedback";
import {
  CAT_PAW_LIFETIME_MS,
  CAT_PAW_PRESS_MS,
  CAT_SLAM_IMPACT_MS,
  CAT_SLAM_LIFETIME_MS,
  CAT_STICKER_FLIGHT_MS,
  createCatClearBatch,
  createCatSlamMotion,
  getCatFlightKeyframes,
  type CatClearBatch,
} from "../../features/themes/catFeedback";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import CatTile from "./CatTile";
import CatDecorations from "./CatDecorations";
import { SIZE } from "../../constants/gameData";

const STICKER_CELLS = [[0, 0]] as const;

export const CatPawDefinition = memo(function CatPawDefinition({
  id,
}: {
  id: string;
}) {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
    >
      <defs>
        <g id={id}>
          <g
            fill="var(--cat-paw-fill, #f1b4cf)"
            stroke="var(--cat-paw-stroke, #d792b5)"
            strokeWidth="2"
          >
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
            stroke="var(--cat-paw-highlight, #ffe6f1)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      </defs>
    </svg>
  );
});

const CatClearEffect = memo(function CatClearEffect({
  batch,
  pawId,
}: {
  batch: CatClearBatch;
  pawId: string;
}) {
  return (
    <span className="cat-clear-batch" data-effect-id={batch.id}>
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
            <use href={`#${pawId}`} />
          </svg>
        </span>
      ))}
    </span>
  );
});

const CatSlamEffect = memo(function CatSlamEffect({
  batch,
  pawId,
}: {
  batch: CatClearBatch;
  pawId: string;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const layer = useRef<HTMLSpanElement>(null);
  const sticker = useRef<HTMLSpanElement>(null);
  const [motion] = useState(() => createCatSlamMotion(batch.cells));
  const stickerCell = batch.cells[motion.stickerIndex];

  useLayoutEffect(() => {
    const root = layer.current;
    const origin = anchor.current?.parentElement;
    const tile = sticker.current;
    if (!root || !origin || !tile) return;
    const { left, top, width, height } = origin.getBoundingClientRect();
    const gap = Number.parseFloat(getComputedStyle(origin).columnGap) || 0;
    const cellWidth = (width - gap * (SIZE - 1)) / SIZE;
    const cellHeight = (height - gap * (SIZE - 1)) / SIZE;
    if (cellWidth <= 0 || cellHeight <= 0) return;

    Object.assign(root.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
    root.style.setProperty("--board-gap", `${gap}px`);
    const { row, col } = stickerCell;
    const startX = left + col * (cellWidth + gap) + cellWidth / 2;
    const startY = top + row * (cellHeight + gap) + cellHeight / 2;
    const viewport = document.documentElement;
    const centerX = viewport.clientWidth / 2;
    const centerY = viewport.clientHeight / 2;
    const scale = Math.min(4.1, 210 / cellWidth);
    const slip = viewport.clientHeight * 0.055;
    const fromX = startX - centerX;
    const fromY = startY - centerY;
    Object.assign(tile.style, {
      left: `${centerX - cellWidth / 2}px`,
      top: `${centerY - cellHeight / 2}px`,
      width: `${cellWidth}px`,
      height: `${cellHeight}px`,
    });

    const pose = (
      x: number,
      y: number,
      angle: number,
      size: number,
      tilt = 0,
    ) =>
      `perspective(650px) translate(${x}px, ${y}px) rotateY(${tilt}deg) rotate(${angle}deg) scale(${size})`;
    const flightSide = fromX > 0 ? 1 : -1;
    const animations = [
      tile.animate(
        [
          { offset: 0, transform: pose(fromX, fromY, 0, 1), opacity: 1 },
          {
            offset: 0.017,
            transform: `${pose(fromX, fromY, 0, 1)} scale(1.06, .78)`,
            easing: "cubic-bezier(.2,.48,.4,.72)",
          },
          {
            offset: 0.105,
            transform: pose(
              fromX * 0.58 + flightSide * 22,
              fromY * 0.52 - Math.min(68, viewport.clientHeight * 0.09),
              flightSide * 28,
              1 + (scale - 1) * 0.32,
              flightSide * 33,
            ),
            easing: "cubic-bezier(.42,.05,.76,.85)",
          },
          {
            offset: 0.205,
            transform: `${pose(0, 0, 6, scale)} scale(1.12, .89)`,
            easing: "ease-out",
          },
          { offset: 0.24, transform: pose(0, 0, 6, scale) },
          { offset: 0.37, transform: pose(0, 0, 6, scale), easing: "ease-in" },
          {
            offset: 0.64,
            transform: pose(3, slip, 23, scale),
            easing: "cubic-bezier(.36,.07,.78,.48)",
          },
          { offset: 0.91, opacity: 1 },
          {
            offset: 1,
            transform: pose(
              viewport.clientWidth * 0.13,
              viewport.clientHeight * 0.76,
              121,
              scale * 0.76,
            ),
            opacity: 0,
          },
        ],
        {
          delay: CAT_SLAM_IMPACT_MS,
          duration: CAT_STICKER_FLIGHT_MS,
          fill: "both",
        },
      ),
    ];
    root.querySelectorAll(".cat-slam-cell").forEach((cell, index) => {
      const flight =
        motion.flights[index < motion.stickerIndex ? index : index + 1];
      animations.push(
        cell.animate(getCatFlightKeyframes(flight, width), {
          delay: CAT_SLAM_IMPACT_MS,
          duration: flight.duration,
          fill: "both",
        }),
      );
    });
    return () => animations.forEach((animation) => animation.cancel());
  }, [motion, stickerCell]);

  return (
    <>
      <span className="cat-clear-batch" ref={anchor} />
      {createPortal(
        <span
          className="cat-slam-overlay"
          aria-hidden="true"
          style={
            { "--cat-impact-delay": `${CAT_SLAM_IMPACT_MS}ms` } as CSSProperties
          }
        >
          <span
            ref={layer}
            className="cat-board-effects cat-slam-grid"
            data-effect-id={batch.id}
          >
            {batch.cells.map(({ row, col, color }, index) => {
              if (index === motion.stickerIndex) return null;
              return (
                <span
                  className="cat-slam-cell"
                  key={`${row}-${col}`}
                  style={{ gridRow: row + 1, gridColumn: col + 1 }}
                >
                  <CatTile color={color} row={row} col={col} />
                </span>
              );
            })}
            <svg className="cat-slam-shadow" viewBox="0 0 100 100">
              <use href={`#${pawId}`} />
            </svg>
            <span className="cat-slam-ripple" />
            <svg className="cat-slam-paw" viewBox="0 0 100 100">
              <use href={`#${pawId}`} />
            </svg>
          </span>
          <span className="cat-slam-cell cat-slam-sticker" ref={sticker}>
            <CatTile
              color={stickerCell.color}
              row={stickerCell.row}
              col={stickerCell.col}
            />
            <CatDecorations
              cells={STICKER_CELLS}
              rows={1}
              cols={1}
              color={stickerCell.color}
              identity={`slam-${batch.id}-${stickerCell.row}-${stickerCell.col}`}
            />
          </span>
        </span>,
        document.body,
      )}
    </>
  );
});

export default memo(function CatBoardEffects({
  feedback,
  board,
  pawId,
  specialPieceGroups,
}: {
  feedback: BoardFeedback | null;
  board: Board;
  pawId: string;
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
    const timer = setTimeout(
      () => {
        active.current = active.current.filter(
          (item) => item.batch.id !== batch.id,
        );
        setBatches(active.current.map((item) => item.batch));
      },
      batch.slam ? CAT_SLAM_LIFETIME_MS : CAT_PAW_LIFETIME_MS,
    );
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
      {batches.map((batch) =>
        batch.slam ? (
          <CatSlamEffect key={batch.id} batch={batch} pawId={pawId} />
        ) : (
          <CatClearEffect key={batch.id} batch={batch} pawId={pawId} />
        ),
      )}
    </span>
  );
});
