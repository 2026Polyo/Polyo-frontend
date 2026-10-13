import PieceShape from "./PieceShape";
import type { PieceInstance, CellCoord } from "../types";

interface PiecePreviewProps {
  piece: PieceInstance;
  disabled: boolean;
  selected: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>, anchorCell: CellCoord) => void;
  onActivate: () => void;
}

function PiecePreview({ piece, disabled, selected, onPointerDown, onActivate }: PiecePreviewProps) {
  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    const cell = event.target instanceof Element ? event.target.closest(".mini-cell") : null;
    const anchorCell: CellCoord =
      cell instanceof HTMLElement && cell.dataset.filled === "true"
        ? [Number(cell.dataset.row), Number(cell.dataset.col)]
        : piece.cells[0];

    onPointerDown(event, anchorCell);
  }

  return (
    <button
      className={`piece-preview ${selected ? "selected" : ""}`}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onClick={(event) => { if (event.detail === 0) onActivate(); }}
      aria-label={`${piece.cells.length}칸 블록 선택`}
      aria-pressed={selected}
      type="button"
    >
      <PieceShape piece={piece} />
    </button>
  );
}

export default PiecePreview;
