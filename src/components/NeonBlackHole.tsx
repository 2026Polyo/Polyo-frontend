import {
  memo,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  createVisualRandom,
  type FeedbackCell,
} from "../features/themes/boardFeedback";
import {
  createNeonFractures,
  createNeonOrbit,
} from "../features/themes/neonBlackHole";
import { getThemeTileStyle, NEON_THEME } from "../features/themes/gameThemes";
import { getSpecialAppearance } from "../features/themes/specialAppearance";
import "../styles/NeonBlackHole.css";

export default memo(function NeonBlackHole({
  cells,
}: {
  cells: FeedbackCell[];
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const tiles = useRef<HTMLDivElement>(null);
  const [fractures] = useState(() => createNeonFractures());

  useLayoutEffect(() => {
    const board = anchor.current?.closest(".board");
    const root = overlay.current;
    const tileLayer = tiles.current;
    if (!board || !root || !tileLayer) return;
    const rect = board.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    root.style.setProperty("--hole-x", `${centerX}px`);
    root.style.setProperty("--hole-y", `${centerY}px`);
    root.style.setProperty(
      "--hole-size",
      `${Math.min(rect.width * 0.47, 245)}px`,
    );
    const random = createVisualRandom();
    const animations: Animation[] = [];
    tileLayer
      .querySelectorAll<HTMLElement>(".neon-hole-tile")
      .forEach((tile, index) => {
        const { row, col } = cells[index];
        const source = board.querySelector(`[data-cell-key="${row}-${col}"]`);
        if (!source) return;
        const bounds = source.getBoundingClientRect();
        Object.assign(tile.style, {
          left: `${bounds.left}px`,
          top: `${bounds.top}px`,
          width: `${bounds.width}px`,
          height: `${bounds.height}px`,
        });
        const { frames, delay, duration } = createNeonOrbit(
          bounds.left + bounds.width / 2 - centerX,
          bounds.top + bounds.height / 2 - centerY,
          random,
        );
        animations.push(
          tile.animate(frames, { delay, duration, fill: "both" }),
        );
      });
    return () => animations.forEach((animation) => animation.cancel());
  }, [cells]);

  return (
    <>
      <span className="pixel-effect-batch" ref={anchor} />
      {createPortal(
        <div className="neon-hole-overlay" ref={overlay} aria-hidden="true">
          <div className="neon-hole-fracture">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              {fractures.shards.map((fracture, index) => (
                <polygon
                  key={`shard-${index}`}
                  points={fracture.points}
                  style={
                    {
                      "--shard-x": fracture.x,
                      "--shard-y": fracture.y,
                      "--shard-angle": fracture.angle,
                    } as CSSProperties
                  }
                />
              ))}
              {fractures.cracks.map((crack, index) => (
                <path
                  key={`crack-${index}`}
                  d={crack.path}
                  className={`neon-glass-${crack.kind}`}
                  style={{
                    strokeWidth: crack.width / 12,
                  }}
                />
              ))}
            </svg>
          </div>
          <div className="neon-hole-core">
            <div className="neon-hole-disk" />
          </div>
          <div ref={tiles}>
            {cells.map((cell) => (
              <span
                className="neon-hole-tile"
                key={`${cell.row}-${cell.col}`}
                data-special={getSpecialAppearance(cell.color)}
                style={getThemeTileStyle(NEON_THEME, cell.color)}
              />
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
});
