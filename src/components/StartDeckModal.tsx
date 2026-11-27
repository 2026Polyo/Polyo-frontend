import { useMemo } from "react";
import { DeckBuilderBackdrop } from "../styles/app/StartDeckModal.styles";
import { Check, Shuffle, X } from "lucide-react";
import { PieceShape } from "./piece";
import { PIECES } from "../mocks/gameData";
import { SPECIAL_LABELS } from "../mocks/specials";
import {
  blockName,
  createPieceInstance,
  pieceBounds,
} from "../utils/pieceUtils";
import type { PieceInstance, PieceTemplate, SpecialType } from "../types";

interface StartDeckModalProps {
  stash: PieceTemplate[];
  loadoutIds: string[];
  baseLoadout: string[];
  availableBaseIds: string[];
  maxBase: number;
  maxSpecial: number;
  onAddBase: (id: string) => void;
  onRemoveBase: (id: string) => void;
  onAddSpecial: (id: string) => void;
  onRemoveSpecial: (id: string) => void;
  onRandomize: () => void;
  onClose: () => void;
}

function countsOf(ids: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  ids.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
  return counts;
}

interface BlockTileProps {
  piece: PieceInstance;
  label?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function BlockTile({
  piece,
  label,
  selected,
  disabled,
  onClick,
}: BlockTileProps) {
  const bounds = pieceBounds(piece);
  const longestSide = Math.max(bounds.rows, bounds.cols);
  const cellSize = Math.min(
    18,
    Math.floor((58 - (longestSide - 1) * 2) / longestSide),
  );

  return (
    <button
      aria-label={`${blockName(piece)} ${selected ? "덱에서 빼기" : "덱에 넣기"}`}
      aria-pressed={Boolean(selected)}
      className={`deck-tile selectable ${label ? "special" : ""} ${selected ? "selected" : ""}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {selected && (
        <span className="deck-tile-check" aria-hidden="true">
          <Check size={14} />
        </span>
      )}
      <PieceShape cellSize={cellSize} cellGap={2} piece={piece} />
      {label && <span className="deck-tile-label">{label}</span>}
    </button>
  );
}

function StartDeckModal({
  stash,
  loadoutIds,
  baseLoadout,
  availableBaseIds,
  maxBase,
  maxSpecial,
  onAddBase,
  onRemoveBase,
  onAddSpecial,
  onRemoveSpecial,
  onRandomize,
  onClose,
}: StartDeckModalProps) {
  // Stable instances (colors don't reshuffle while editing).
  const ownedBase = useMemo(() => {
    const available = new Set(availableBaseIds);
    return PIECES.filter((piece) => available.has(piece.id)).map(
      createPieceInstance,
    );
  }, [availableBaseIds]);
  const ownedSpecials = useMemo(() => stash.map(createPieceInstance), [stash]);
  const templateById = useMemo(() => {
    const map = new Map<string, PieceInstance>();
    [...ownedBase, ...ownedSpecials].forEach((piece) =>
      map.set(piece.id, piece),
    );
    return map;
  }, [ownedBase, ownedSpecials]);

  const baseCounts = useMemo(() => countsOf(baseLoadout), [baseLoadout]);
  const specialCounts = useMemo(() => countsOf(loadoutIds), [loadoutIds]);

  const availableSet = useMemo(
    () => new Set(availableBaseIds),
    [availableBaseIds],
  );
  const baseTotal = baseLoadout.filter((id) => availableSet.has(id)).length;
  const specialTotal = loadoutIds.length;

  // Unique blocks currently in the deck, in catalog order.
  const deckBaseIds = ownedBase
    .map((p) => p.id)
    .filter((id) => (baseCounts.get(id) ?? 0) > 0);
  const deckSpecialIds = ownedSpecials
    .map((p) => p.id)
    .filter((id) => (specialCounts.get(id) ?? 0) > 0);

  return (
    <DeckBuilderBackdrop
      className="deck-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-deck-title"
      onClick={onClose}
    >
      <section
        className="deck-panel deck-builder"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="deck-builder-header">
          <div className="deck-heading">
            <div>
              <span>Deck</span>
              <strong id="start-deck-title">덱 구성</strong>
            </div>
            <button
              aria-label="닫기"
              className="deck-close"
              onClick={onClose}
              type="button"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="deck-hint">블록을 눌러 선택하거나 해제하세요.</p>
        </div>

        <div className="deck-columns">
          {/* 현재 덱 */}
          <div className="deck-column deck-current-column">
            <p className="deck-section-title">
              현재 덱 · 기본 ({baseTotal}/{maxBase})
            </p>
            <div className="deck-grid mini">
              {deckBaseIds.length === 0 && (
                <p className="deck-empty">비어 있음</p>
              )}
              {deckBaseIds.map((id) => (
                <BlockTile
                  key={id}
                  piece={templateById.get(id)!}
                  selected
                  disabled={baseTotal <= 1}
                  onClick={() => onRemoveBase(id)}
                />
              ))}
            </div>
            <p className="deck-section-title">
              현재 덱 · 특수 ({specialTotal}/{maxSpecial})
            </p>
            <div className="deck-grid mini">
              {deckSpecialIds.length === 0 && (
                <p className="deck-empty">비어 있음</p>
              )}
              {deckSpecialIds.map((id) => {
                const piece = templateById.get(id);
                return piece ? (
                  <BlockTile
                    key={id}
                    piece={piece}
                    selected
                    label={
                      SPECIAL_LABELS[piece.special as SpecialType] ?? "특수"
                    }
                    onClick={() => onRemoveSpecial(id)}
                  />
                ) : null;
              })}
            </div>
          </div>

          {/* 가진 블록 */}
          <div className="deck-column">
            <p className="deck-section-title">가진 블록 · 기본</p>
            <div className="deck-grid mini">
              {ownedBase.map((piece) => {
                const inDeck = (baseCounts.get(piece.id) ?? 0) > 0;
                return (
                  <BlockTile
                    key={piece.id}
                    piece={piece}
                    selected={inDeck}
                    disabled={inDeck ? baseTotal <= 1 : baseTotal >= maxBase}
                    onClick={() =>
                      inDeck ? onRemoveBase(piece.id) : onAddBase(piece.id)
                    }
                  />
                );
              })}
            </div>
            <p className="deck-section-title">가진 블록 · 특수</p>
            <div className="deck-grid mini">
              {ownedSpecials.length === 0 && (
                <p className="deck-empty">아직 해금한 특수 블록이 없습니다.</p>
              )}
              {ownedSpecials.map((piece) => {
                const inDeck = (specialCounts.get(piece.id) ?? 0) > 0;
                return (
                  <BlockTile
                    key={piece.id}
                    piece={piece}
                    label={
                      SPECIAL_LABELS[piece.special as SpecialType] ?? "특수"
                    }
                    selected={inDeck}
                    disabled={!inDeck && specialTotal >= maxSpecial}
                    onClick={() =>
                      inDeck
                        ? onRemoveSpecial(piece.id)
                        : onAddSpecial(piece.id)
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>
        <div className="deck-builder-footer">
          <p aria-live="polite" role="status">
            {baseTotal === maxBase
              ? "선택한 덱이 자동 저장됩니다."
              : `완료하려면 기본 블록 ${maxBase}개를 선택해야 해요. (현재 ${baseTotal}/${maxBase})`}
          </p>
          <div className="deck-builder-actions">
            <button
              className="deck-done deck-randomize"
              onClick={onRandomize}
              type="button"
            >
              <Shuffle size={17} aria-hidden="true" />
              랜덤 덱 구성
            </button>
            <button
              className="deck-done"
              disabled={baseTotal !== maxBase}
              onClick={onClose}
              type="button"
            >
              완료
            </button>
          </div>
        </div>
      </section>
    </DeckBuilderBackdrop>
  );
}

export default StartDeckModal;
