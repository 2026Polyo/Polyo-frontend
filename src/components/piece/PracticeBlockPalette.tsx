import { memo, type CSSProperties } from "react";
import PiecePreview from "./PiecePreview";
import type { UsePieceSelectionResult } from "../../hooks/usePieceSelection";
import type { PieceInstance } from "../../types";
import { blockName, pieceBounds } from "../../utils/pieceUtils";

interface PracticeBlockPaletteProps {
  pieces: PieceInstance[];
  selectedId: string | null;
  disabled: boolean;
  onPieceSelect: UsePieceSelectionResult["handlePieceSelect"];
  onPieceActivate: UsePieceSelectionResult["handlePieceActivate"];
}

// Keep the catalog unchanged while the pointer and board preview move.
export default memo(function PracticeBlockPalette({
  pieces,
  selectedId,
  disabled,
  onPieceSelect,
  onPieceActivate,
}: PracticeBlockPaletteProps) {
  return (
    <aside className="practice-palette" aria-labelledby="practice-blocks-title">
      <div className="practice-palette-heading">
        <h2 id="practice-blocks-title">블록 목록</h2>
        <span>{pieces.length}종</span>
      </div>
      <p>드래그하거나 선택 후 보드를 누르세요.</p>
      <div className="practice-block-list tray" aria-label="연습용 블록 목록">
        {pieces.map((piece) => {
          const bounds = pieceBounds(piece);
          const longest = Math.max(bounds.rows, bounds.cols);
          const cellSize = Math.min(
            16,
            Math.floor((62 - (longest - 1) * 2) / longest),
          );
          return (
            <div
              key={piece.uid}
              data-piece-id={piece.id}
              style={
                { "--practice-cell-size": `${cellSize}px` } as CSSProperties
              }
            >
              <PiecePreview
                label={blockName(piece)}
                piece={piece}
                disabled={disabled}
                selected={selectedId === piece.uid}
                onPointerDown={(event, anchor) =>
                  onPieceSelect(piece, event, anchor)
                }
                onActivate={() => onPieceActivate(piece)}
              />
            </div>
          );
        })}
      </div>
    </aside>
  );
});
