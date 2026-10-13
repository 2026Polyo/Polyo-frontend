import { colorClass } from "../constants/gameData";
import "../styles/PieceShape.css";
import { pieceBounds } from "../utils/pieceUtils";
import type { PieceInstance } from "../types";

interface PieceShapeProps {
  piece: PieceInstance;
  cellSize?: number;
  cellGap?: number;
  className?: string;
}

function PieceShape({ piece, cellSize = 26, cellGap = 3, className = "" }: PieceShapeProps) {
  const bounds = pieceBounds(piece);
  const filledColorClass = colorClass[piece.color] || colorClass["cyan"];

  return (
    <span
      className={`mini-grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${bounds.cols}, var(--mini-cell-size))`,
        gridTemplateRows: `repeat(${bounds.rows}, var(--mini-cell-size))`,
        "--mini-cell-gap": `${cellGap}px`,
        "--mini-cell-size": `${cellSize}px`
      } as React.CSSProperties}
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
            key={`${row}-${col}`}
          />
        );
      })}
    </span>
  );
}

export default PieceShape;
