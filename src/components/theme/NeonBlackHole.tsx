import {
  memo,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { createVisualRandom, type FeedbackCell } from "../../features/themes";
import { createNeonFractures, createNeonOrbit } from "../../features/themes";
import { getThemeTileStyle, NEON_THEME } from "../../features/themes";
import { getSpecialAppearance } from "../../features/themes";
import { NeonHoleOverlay } from "../../styles/theme/NeonBlackHole.styles";

export default memo(function NeonBlackHole({
  cells,
}: {
  cells: FeedbackCell[];
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const tiles = useRef<HTMLDivElement>(null);
  const effectId = `neon-glass-${useId().replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const [fractures] = useState(() =>
    createNeonFractures(
      createVisualRandom(),
      typeof window === "undefined"
        ? 1
        : window.innerWidth / window.innerHeight,
    ),
  );

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
        <NeonHoleOverlay
          className="neon-hole-overlay"
          ref={overlay}
          aria-hidden="true"
        >
          <div className="neon-hole-pressure" />
          <div className="neon-hole-fracture">
            <svg
              viewBox={`0 0 ${fractures.width} ${fractures.height}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id={`${effectId}-surface`}
                  x1="0"
                  y1="0"
                  x2="0.8"
                  y2="1"
                >
                  <stop offset="0" stopColor="#e3f4ff" stopOpacity="0.45" />
                  <stop offset="0.42" stopColor="#c9bfff" stopOpacity="0" />
                  <stop offset="0.65" stopColor="#b6e9ff" stopOpacity="0.7" />
                  <stop offset="1" stopColor="#f1f8ff" stopOpacity="0.12" />
                </linearGradient>
                {fractures.cracks.map((crack, index) => (
                  <linearGradient
                    key={index}
                    id={`${effectId}-${index}`}
                    gradientUnits="userSpaceOnUse"
                    x1={crack.from.x}
                    y1={crack.from.y}
                    x2={crack.from.x + (crack.to.x - crack.from.x) * 0.5}
                    y2={crack.from.y + (crack.to.y - crack.from.y) * 0.5}
                  >
                    <stop offset="0" stopColor="#f7fbff" stopOpacity="0.9" />
                    <stop
                      offset="0.16"
                      stopColor="#899dbd"
                      stopOpacity="0.35"
                    />
                    <stop
                      offset="0.33"
                      stopColor="#f4f5ff"
                      stopOpacity="0.95"
                    />
                    <stop
                      offset="0.48"
                      stopColor="#829cb5"
                      stopOpacity="0.28"
                    />
                    <stop
                      offset="0.67"
                      stopColor="#dceaff"
                      stopOpacity="0.85"
                    />
                    <stop
                      offset="0.86"
                      stopColor="#f5faff"
                      stopOpacity="0.65"
                    />
                    <stop offset="1" stopColor="#a6bed4" stopOpacity="0.18" />
                  </linearGradient>
                ))}
              </defs>
              {fractures.facets.map((facet, index) => (
                <polygon
                  key={`facet-${index}`}
                  className="neon-glass-facet"
                  points={facet.points}
                  fill={`url(#${effectId}-surface)`}
                  opacity={facet.opacity}
                />
              ))}
              {fractures.shards.map((fracture, index) => (
                <polygon
                  key={`shard-${index}`}
                  className="neon-glass-chip"
                  points={fracture.points}
                  fill={`url(#${effectId}-surface)`}
                  style={
                    {
                      "--shard-x": fracture.x,
                      "--shard-y": fracture.y,
                      "--shard-angle": fracture.angle,
                      "--shard-duration": `${fracture.duration}ms`,
                      "--shard-delay": `${fracture.delay}ms`,
                    } as CSSProperties
                  }
                />
              ))}
              {fractures.cracks.map((crack, index) => (
                <g
                  key={`crack-${index}`}
                  className={`neon-glass-${crack.kind}`}
                >
                  <path d={crack.shadow} className="neon-glass-shadow" />
                  <path d={crack.path} fill={`url(#${effectId}-${index})`} />
                  <path
                    d={crack.highlight}
                    className="neon-glass-highlight"
                    fill={`url(#${effectId}-${index})`}
                  />
                </g>
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
        </NeonHoleOverlay>,
        document.body,
      )}
    </>
  );
});
