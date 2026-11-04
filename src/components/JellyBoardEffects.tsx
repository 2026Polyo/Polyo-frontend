import { memo, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  MAX_EFFECT_BATCHES,
  type BoardFeedback,
} from "../features/themes/boardFeedback";
import {
  createJellyEffectBatch,
  JELLY_BREAK_MS,
  JELLY_LANDING_MS,
  JELLY_SLASH_MS,
  JELLY_EFFECT_LIFETIME_MS,
  type JellyEffectBatch,
  type JellyEffectCell,
} from "../features/themes/jellyFeedback";
import { getThemeTileStyle } from "../features/themes/gameThemes";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useGameTheme } from "./ThemeScope";

const JellyParticles = memo(function JellyParticles({
  cell,
  kind,
}: {
  cell: JellyEffectCell;
  kind: "drop" | "shard";
}) {
  const theme = useGameTheme();
  return (
    <span
      className={`jelly-effect-cell jelly-${kind}`}
      style={
        {
          gridRow: cell.row + 1,
          gridColumn: cell.col + 1,
          ...getThemeTileStyle(theme, cell.color),
          "--jelly-impact-x": `${cell.impact?.x ?? 0}px`,
          "--jelly-impact-y": `${cell.impact?.y ?? 0}px`,
        } as CSSProperties
      }
    >
      {cell.particles.map((particle, index) => (
        <i
          key={index}
          style={
            {
              "--jelly-x": `${particle.x}px`,
              "--jelly-y": `${particle.y}px`,
              "--jelly-rotation": `${particle.rotation}deg`,
              "--jelly-delay": `${particle.delay}ms`,
              "--jelly-duration": `${particle.duration}ms`,
              width: `${particle.size}${kind === "drop" ? "px" : "%"}`,
              left: particle.shape ? `${particle.shape.left}%` : "50%",
              top: particle.shape ? `${particle.shape.top}%` : "50%",
              ...(particle.shape
                ? {
                    height: `${particle.shape.height}%`,
                    "--jelly-shape": particle.shape.radius,
                    "--jelly-relaxed-shape": particle.shape.relaxedRadius,
                  }
                : {}),
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
});

const JellyBatch = memo(function JellyBatch({
  batch,
}: {
  batch: JellyEffectBatch;
}) {
  const theme = useGameTheme();
  const placedKeys = new Set(
    batch.placed.map(({ row, col }) => `${row}-${col}`),
  );
  return (
    <div className="jelly-effect-batch" data-effect-id={batch.id}>
      {batch.bounds && (
        <div
          className="jelly-landing"
          style={{
            gridRow: `${batch.bounds.row + 1} / span ${batch.bounds.rows}`,
            gridColumn: `${batch.bounds.col + 1} / span ${batch.bounds.cols}`,
            gridTemplateRows: `repeat(${batch.bounds.rows}, minmax(0, 1fr))`,
            gridTemplateColumns: `repeat(${batch.bounds.cols}, minmax(0, 1fr))`,
          }}
        >
          {batch.placed.map((cell) => (
            <span
              className="jelly-tile-face"
              key={`${cell.row}-${cell.col}`}
              style={{
                gridRow: cell.row - batch.bounds!.row + 1,
                gridColumn: cell.col - batch.bounds!.col + 1,
                ...getThemeTileStyle(theme, cell.color),
              }}
            />
          ))}
        </div>
      )}
      {batch.placed.map((cell) => (
        <JellyParticles
          key={`drop-${cell.row}-${cell.col}`}
          cell={cell}
          kind="drop"
        />
      ))}
      {batch.cleared.map((cell) => (
        <span
          className="jelly-effect-cell jelly-clear"
          key={`intact-${cell.row}-${cell.col}`}
          style={
            {
              gridRow: cell.row + 1,
              gridColumn: cell.col + 1,
              ...getThemeTileStyle(theme, cell.color),
              "--jelly-impact-x": `${cell.impact?.x ?? 0}px`,
              "--jelly-impact-y": `${cell.impact?.y ?? 0}px`,
              "--jelly-cut-angle": `${Math.atan2(cell.impact?.y ?? 0, cell.impact?.x ?? 0)}rad`,
            } as CSSProperties
          }
        >
          <span
            className={`jelly-tile-face jelly-clear-intact ${placedKeys.has(`${cell.row}-${cell.col}`) ? "jelly-clear-new" : ""}`}
            style={{
              animationDelay: `${placedKeys.has(`${cell.row}-${cell.col}`) ? JELLY_LANDING_MS : 0}ms, ${JELLY_SLASH_MS}ms`,
              animationDuration: `${placedKeys.has(`${cell.row}-${cell.col}`) ? JELLY_BREAK_MS - JELLY_LANDING_MS : JELLY_BREAK_MS}ms, ${JELLY_BREAK_MS - JELLY_SLASH_MS}ms`,
            }}
          />
        </span>
      ))}
      {batch.slashes.map((slash) => (
        <span
          key={`${slash.axis}-${slash.index}-${slash.start}`}
          className={`jelly-slash jelly-slash-${slash.axis}`}
          style={{
            gridRow:
              slash.axis === "row"
                ? slash.index + 1
                : `${slash.start + 1} / span ${slash.length}`,
            gridColumn:
              slash.axis === "col"
                ? slash.index + 1
                : `${slash.start + 1} / span ${slash.length}`,
          }}
        >
          <i />
        </span>
      ))}
      {batch.cleared.map((cell) => (
        <JellyParticles
          key={`shard-${cell.row}-${cell.col}`}
          cell={cell}
          kind="shard"
        />
      ))}
    </div>
  );
});

interface ActiveBatch {
  batch: JellyEffectBatch;
  timer: ReturnType<typeof setTimeout>;
}

export default function JellyBoardEffects({
  feedback,
}: {
  feedback: BoardFeedback | null;
}) {
  const reducedMotion = useReducedMotion();
  const [batches, setBatches] = useState<JellyEffectBatch[]>([]);
  const active = useRef<ActiveBatch[]>([]);
  const lastFeedbackId = useRef<number | null>(null);

  // 같은 프레임에서 원래 타일과 낙하 모형을 교체해 첫 프레임의 중복 표시를 막는다.
  useLayoutEffect(() => {
    if (!feedback || reducedMotion) {
      active.current.forEach(({ timer }) => clearTimeout(timer));
      active.current = [];
      lastFeedbackId.current = feedback?.id ?? null;
      setBatches([]);
      return;
    }
    if (lastFeedbackId.current === feedback.id) return;
    lastFeedbackId.current = feedback.id;
    const retained = [...active.current];
    while (retained.length >= MAX_EFFECT_BATCHES)
      clearTimeout(retained.shift()!.timer);
    const batch = createJellyEffectBatch(feedback);
    const timer = setTimeout(() => {
      active.current = active.current.filter(
        (entry) => entry.batch.id !== batch.id,
      );
      setBatches(active.current.map((entry) => entry.batch));
    }, JELLY_EFFECT_LIFETIME_MS);
    active.current = [...retained, { batch, timer }];
    setBatches(active.current.map((entry) => entry.batch));
  }, [feedback, reducedMotion]);

  useLayoutEffect(
    () => () => {
      active.current.forEach(({ timer }) => clearTimeout(timer));
      active.current = [];
      lastFeedbackId.current = null;
    },
    [],
  );

  if (reducedMotion || !batches.length) return null;
  return (
    <div
      className="board-jelly-effects"
      aria-hidden="true"
      style={
        {
          "--jelly-landing-time": `${JELLY_LANDING_MS}ms`,
          "--jelly-slash-time": `${JELLY_SLASH_MS}ms`,
          "--jelly-cut-duration": `${JELLY_BREAK_MS - JELLY_SLASH_MS}ms`,
        } as CSSProperties
      }
    >
      {batches.map((batch) => (
        <JellyBatch key={batch.id} batch={batch} />
      ))}
    </div>
  );
}
