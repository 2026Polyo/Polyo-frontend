import { getThemePresentation } from "../features/themePresentation";
import { getGameTheme } from "../features/themes/gameThemes";
import ThemeFieldBackground from "./ThemeFieldBackground";
import "../styles/JellyTheme.css";
import type { CSSProperties } from "react";
import MinecraftTile from "./MinecraftTile";
import CatTile from "./CatTile";
import { getCatConnections } from "../features/themes/catConnections";
import CatDecorations from "./CatDecorations";
import type { CatCell } from "../features/themes/catRegions";

// All shop thumbnails and dialogs share the game's 8×8 field layout.
const PREVIEW_CELLS = [
  [-1, -1, -1, -1, -1, -1, -1, -1],
  [-1, 0, 0, -1, -1, 1, 1, -1],
  [-1, 0, 0, -1, -1, 1, 1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1],
  [-1, 2, -1, -1, 3, 3, 3, -1],
  [-1, 2, 2, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, 4, 4, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1],
].flat();
const CAT_PREVIEW_CELLS = PREVIEW_CELLS.flatMap((cell, index) =>
  cell >= 0 ? [[Math.floor(index / 8), index % 8] as CatCell] : [],
);

export default function ThemePreview({ themeId }: { themeId: string }) {
  const { colors, glow, jelly, minecraft, cat } = getThemePresentation(themeId);
  const background = getGameTheme(themeId).background;
  const cells = PREVIEW_CELLS;
  const rows = cells.length / 8;

  return (
    <div
      className={`shop-preview ${glow ? "shop-preview-neon" : ""} ${jelly ? "shop-preview-jelly" : ""} ${minecraft ? "shop-preview-minecraft" : ""} ${cat ? "shop-preview-cat" : ""}`}
      aria-hidden="true"
    >
      <div className="shop-preview-board">
        {background && <ThemeFieldBackground background={background} />}
        {cells.map((cell, index) => (
          <span
            key={index}
            className={cell >= 0 ? "shop-preview-filled" : ""}
            style={
              cell >= 0
                ? ({
                    backgroundColor: glow
                      ? "#02050b"
                      : jelly || minecraft || cat
                        ? "transparent"
                        : colors[cell],
                    color: colors[cell],
                    ...(jelly ? { "--theme-tile-color": colors[cell] } : {}),
                  } as CSSProperties)
                : undefined
            }
          >
            {cat && cell >= 0 && (
              <CatTile
                row={Math.floor(index / 8)}
                col={index % 8}
                joined={getCatConnections(
                  (r, c) =>
                    r >= 0 &&
                    r < rows &&
                    c >= 0 &&
                    c < 8 &&
                    cells[r * 8 + c] >= 0,
                  Math.floor(index / 8),
                  index % 8,
                )}
              />
            )}
            {minecraft && cell >= 0 && (
              <MinecraftTile
                color={["cyan", "lime", "amber", "violet", "pink"][cell]}
              />
            )}
          </span>
        ))}
        {cat && (
          <CatDecorations
            cells={CAT_PREVIEW_CELLS}
            rows={rows}
            cols={8}
            identity="cat-shop-preview"
          />
        )}
      </div>
      <div className="shop-swatches">
        {colors.map((color, index) => (
          <i key={`${color}-${index}`} style={{ backgroundColor: color }} />
        ))}
      </div>
    </div>
  );
}
