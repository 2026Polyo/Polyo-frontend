import { memo, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { getThemeTileColor } from "../features/themes/gameThemes";
import {
  createPixelParticles,
  MAX_ACTIVE_PARTICLES,
  MAX_EFFECT_BATCHES,
  PIXEL_EFFECT_LIFETIME_MS,
  PLACEMENT_EFFECT_LIFETIME_MS,
  uniqueFeedbackCells,
  type BoardFeedback,
  type FeedbackCell,
  type PixelParticle,
} from "../features/themes/boardFeedback";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useGameTheme } from "./ThemeScope";

interface EffectCell extends FeedbackCell {
  particles: PixelParticle[];
}

interface EffectBatch {
  id: number;
  placed: EffectCell[];
  cleared: EffectCell[];
}

const PixelCell = memo(function PixelCell({
  cell,
  kind,
}: {
  cell: EffectCell;
  kind: "place" | "clear";
}) {
  const theme = useGameTheme();
  return (
    <span
      className={`pixel-effect-cell pixel-effect-${kind}`}
      style={
        {
          gridRow: cell.row + 1,
          gridColumn: cell.col + 1,
          "--pixel-color": getThemeTileColor(theme, cell.color),
        } as CSSProperties
      }
    >
      {cell.particles.map((particle, index) => {
        const top = kind === "clear" && particle.top === 0;
        const left = kind === "clear" && particle.left === 0;
        const right = kind === "clear" && particle.left + particle.size === 100;
        const bottom = kind === "clear" && particle.top + particle.size === 100;
        return (
          <i
            key={index}
            style={
              {
                "--pixel-x": `${particle.x}px`,
                "--pixel-y": `${particle.y}px`,
                "--pixel-delay": `${particle.delay}ms`,
                "--pixel-duration": `${particle.duration}ms`,
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: `${particle.size}${kind === "place" ? "px" : "%"}`,
                ...(kind === "clear"
                  ? {
                      "--melt-top": top ? "1px" : "0px",
                      "--melt-right": right ? "1px" : "0px",
                      "--melt-bottom": bottom ? "1px" : "0px",
                      "--melt-left": left ? "1px" : "0px",
                      borderRadius: `${top && left ? 3 : 0}px ${top && right ? 3 : 0}px ${bottom && right ? 3 : 0}px ${bottom && left ? 3 : 0}px`,
                    }
                  : {}),
              } as CSSProperties
            }
          />
        );
      })}
    </span>
  );
});

interface ActiveBatch {
  feedback: EffectBatch;
  particleCount: number;
  timer: ReturnType<typeof setTimeout>;
}

export default function BoardEffects({
  feedback,
}: {
  feedback: BoardFeedback | null;
}) {
  const reducedMotion = useReducedMotion();
  const [batches, setBatches] = useState<EffectBatch[]>([]);
  const active = useRef<ActiveBatch[]>([]);
  const lastFeedbackId = useRef<number | null>(null);

  useEffect(() => {
    if (!feedback || reducedMotion) {
      active.current.forEach(({ timer }) => clearTimeout(timer));
      active.current = [];
      lastFeedbackId.current = feedback?.id ?? null;
      setBatches([]);
      return;
    }
    if (lastFeedbackId.current === feedback.id) return;
    lastFeedbackId.current = feedback.id;

    const batch: EffectBatch = {
      id: feedback.id,
      placed: uniqueFeedbackCells(feedback.placed).map((cell) => ({
        ...cell,
        particles: createPixelParticles("place"),
      })),
      cleared: uniqueFeedbackCells(feedback.cleared).map((cell) => ({
        ...cell,
        particles: createPixelParticles("clear"),
      })),
    };
    const particleCount = [...batch.placed, ...batch.cleared].reduce(
      (total, cell) => total + cell.particles.length,
      0,
    );
    const retained = [...active.current];
    let totalParticles = retained.reduce(
      (total, entry) => total + entry.particleCount,
      particleCount,
    );
    while (
      retained.length > 0 &&
      (retained.length >= MAX_EFFECT_BATCHES ||
        totalParticles > MAX_ACTIVE_PARTICLES)
    ) {
      const removed = retained.shift()!;
      clearTimeout(removed.timer);
      totalParticles -= removed.particleCount;
    }
    const timer = setTimeout(
      () => {
        active.current = active.current.filter(
          (entry) => entry.feedback.id !== feedback.id,
        );
        setBatches(active.current.map((entry) => entry.feedback));
      },
      feedback.cleared.length > 0
        ? PIXEL_EFFECT_LIFETIME_MS
        : PLACEMENT_EFFECT_LIFETIME_MS,
    );
    active.current = [...retained, { feedback: batch, particleCount, timer }];
    setBatches(active.current.map((entry) => entry.feedback));
  }, [feedback, reducedMotion]);

  useEffect(
    () => () => {
      active.current.forEach(({ timer }) => clearTimeout(timer));
      active.current = [];
      lastFeedbackId.current = null;
    },
    [],
  );

  if (!feedback || reducedMotion || batches.length === 0) return null;

  return (
    <div className="board-pixel-effects" aria-hidden="true">
      {batches.map((batch) => (
        <div
          className="pixel-effect-batch"
          key={batch.id}
          data-effect-id={batch.id}
        >
          {batch.placed.map((cell) => (
            <PixelCell
              key={`place-${cell.row}-${cell.col}`}
              cell={cell}
              kind="place"
            />
          ))}
          {batch.cleared.map((cell) => (
            <PixelCell
              key={`clear-${cell.row}-${cell.col}`}
              cell={cell}
              kind="clear"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
