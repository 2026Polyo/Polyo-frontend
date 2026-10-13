import PiecePreview from "./PiecePreview";
import "../styles/PieceTray.css";
import type { PieceInstance, Tray, CellCoord } from "../types";

interface PieceTrayProps {
  disabled: boolean;
  onEmptySlotClick: () => void;
  onPieceSelect: (piece: PieceInstance, event: React.PointerEvent<HTMLButtonElement>, anchorCell: CellCoord) => void;
  onPieceActivate: (piece: PieceInstance) => void;
  selectedId: string | null;
  tray: Tray;
}

function PieceTray({
  disabled,
  onEmptySlotClick,
  onPieceSelect,
  onPieceActivate,
  selectedId,
  tray
}: PieceTrayProps) {
  return (
    <div className="tray" aria-label="사용 가능한 블록">
      {tray.map((piece, index) =>
        piece ? (
          <PiecePreview
            disabled={disabled}
            key={piece.uid}
            onPointerDown={(event, anchorCell) => onPieceSelect(piece, event, anchorCell)}
            onActivate={() => onPieceActivate(piece)}
            piece={piece}
            selected={selectedId === piece.uid}
          />
        ) : (
          <div
            className="piece-preview empty"
            key={`empty-${index}`}
            onPointerDown={selectedId ? onEmptySlotClick : undefined}
          />
        )
      )}
    </div>
  );
}

export default PieceTray;
