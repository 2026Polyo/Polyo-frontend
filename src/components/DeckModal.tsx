import "../styles/DeckModal.css";
import { X } from "lucide-react";
import PieceShape from "./PieceShape";
import { SPECIAL_LABELS } from "../features/specials";
import type { PieceInstance } from "../types";

interface DeckTileProps {
  piece: PieceInstance;
}

function DeckTile({ piece }: DeckTileProps) {
  return (
    <div className={`deck-tile ${piece.special ? "special" : ""}`}>
      <PieceShape cellSize={16} cellGap={2} piece={piece} />
      {piece.special && (
        <span className="deck-tile-label">{SPECIAL_LABELS[piece.special] ?? "특수"}</span>
      )}
    </div>
  );
}

interface DeckModalProps {
  deckPieces: PieceInstance[];
  onClose: () => void;
}

function DeckModal({ deckPieces, onClose }: DeckModalProps) {
  const specials = deckPieces.filter((piece) => piece.special);
  const base = deckPieces.filter((piece) => !piece.special);

  return (
    <div
      className="deck-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deck-title"
      onClick={onClose}
    >
      <section className="deck-panel" onClick={(event) => event.stopPropagation()}>
        <div className="deck-heading">
          <div>
            <span>Deck</span>
            <strong id="deck-title">현재 덱 ({deckPieces.length})</strong>
          </div>
          <button aria-label="닫기" className="deck-close" onClick={onClose} type="button">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {specials.length > 0 && (
          <div className="deck-section">
            <p className="deck-section-title">특수 블록 ({specials.length})</p>
            <div className="deck-grid">
              {specials.map((piece, index) => (
                <DeckTile key={`special-${piece.id}-${index}`} piece={piece} />
              ))}
            </div>
          </div>
        )}

        <div className="deck-section">
          <p className="deck-section-title">기본 블록 ({base.length})</p>
          <div className="deck-grid">
            {base.map((piece, index) => (
              <DeckTile key={`base-${piece.id}-${index}`} piece={piece} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default DeckModal;
