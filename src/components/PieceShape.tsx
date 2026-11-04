import { colorClass } from "../constants/gameData";
import "../styles/PieceShape.css";
import { pieceBounds } from "../utils/pieceUtils";
import type { PieceInstance } from "../types";
import { useGameTheme } from "./ThemeScope";
import { getThemeTileStyle } from "../features/themes/gameThemes";
import MinecraftTile from "./MinecraftTile";
import CatTile from "./CatTile";
import { getCatConnections } from "../features/themes/catConnections";
import CatDecorations from "./CatDecorations";

interface PieceShapeProps {
  piece: PieceInstance;
  cellSize?: number;
  cellGap?: number;
  className?: string;
}

function PieceShape({
  piece,
  cellSize = 26,
  cellGap = 3,
  className = "",
}: PieceShapeProps) {
  const theme = useGameTheme();
  const bounds = pieceBounds(piece);
  const filledColorClass = colorClass[piece.color] || colorClass["cyan"];

  return (
    <span
      className={`mini-grid ${className}`}
      data-game-theme={theme.id}
      style={
        {
          gridTemplateColumns: `repeat(${bounds.cols}, var(--mini-cell-size))`,
          gridTemplateRows: `repeat(${bounds.rows}, var(--mini-cell-size))`,
          "--mini-cell-gap": `${cellGap}px`,
          "--mini-cell-size": `${cellSize}px`,
        } as React.CSSProperties
      }
    >
      {Array.from({ length: bounds.rows * bounds.cols }, (_, index) => {
        const row = Math.floor(index / bounds.cols);
        const col = index % bounds.cols;
        const filled = piece.cells.some(([r, c]) => r === row && c === col);
        return (
          <span
            className={`mini-cell ${filled ? filledColorClass : ""}`}
            data-col={col}
            data-filled={filled ? "true" : "false"}
            data-row={row}
            style={filled ? getThemeTileStyle(theme, piece.color) : undefined}
            key={`${row}-${col}`}
          >
            {filled && theme.tileStyle === "cat" && (
              <CatTile
                joined={getCatConnections(
                  (r, c) =>
                    piece.cells.some(([pr, pc]) => pr === r && pc === c),
                  row,
                  col,
                )}
              />
            )}
            {filled && theme.tileStyle === "jelly" && (
              <span className="jelly-tile-face" aria-hidden="true" />
            )}
            {filled && theme.tileStyle === "minecraft" && (
              <MinecraftTile color={piece.color} />
            )}
          </span>
        );
      })}
      {theme.tileStyle === "cat" && (
        <CatDecorations
          cells={piece.cells}
          rows={bounds.rows}
          cols={bounds.cols}
          identity={piece.uid}
        />
      )}
    </span>
  );
}

export default PieceShape;
