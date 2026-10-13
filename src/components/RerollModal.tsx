import { useMemo, useState } from "react";
import "../styles/RerollModal.css";
import PieceShape from "./PieceShape";
import { getRerollCount, getRerollReplacementMode } from "../features/augments";
import { deckPieceInstances, rerollCandidates, rerollSlots } from "../utils/tray";
import type { Board, PieceInstance, PieceTemplate, Tray } from "../types";

const CANDIDATE_COUNT = 3;

interface RerollModalProps {
  board: Board;
  deckPieces: PieceTemplate[];
  level: number;
  onApply: (tray: Tray) => void;
  onCancel: () => void;
  tray: Tray;
}

function RerollModal({ board, deckPieces, level, onApply, onCancel, tray }: RerollModalProps) {
  const filledSlots = useMemo<number[]>(
    () => tray.reduce<number[]>((slots, piece, index) => (piece ? [...slots, index] : slots), []),
    [tray]
  );
  const count = Math.min(getRerollCount(level), filledSlots.length);
  const mode = getRerollReplacementMode(level);

  const [step, setStep] = useState<"select" | "choose">("select");
  // When the reroll covers every block there is nothing to choose, so pre-select all.
  const [selectedSlots, setSelectedSlots] = useState<number[]>(() =>
    count >= filledSlots.length ? filledSlots : []
  );
  const [chooseIndex, setChooseIndex] = useState<number>(0);
  const [replacements, setReplacements] = useState<Record<number, PieceInstance>>({});
  const [options, setOptions] = useState<PieceInstance[]>([]);

  function toggleSlot(slotIndex: number) {
    setSelectedSlots((current) => {
      if (current.includes(slotIndex)) return current.filter((slot) => slot !== slotIndex);
      if (current.length >= count) return current;
      return [...current, slotIndex];
    });
  }

  function nextOptions(): PieceInstance[] {
    return mode === "deck" ? deckPieceInstances(deckPieces) : rerollCandidates(CANDIDATE_COUNT, deckPieces);
  }

  function confirmSelection() {
    if (selectedSlots.length !== count) return;

    if (mode === "random") {
      onApply(rerollSlots(board, tray, selectedSlots, deckPieces));
      return;
    }

    setChooseIndex(0);
    setReplacements({});
    setOptions(nextOptions());
    setStep("choose");
  }

  function pickReplacement(piece: PieceInstance) {
    const slotIndex = selectedSlots[chooseIndex];
    const nextReplacements = { ...replacements, [slotIndex]: piece };
    const nextIndex = chooseIndex + 1;

    if (nextIndex >= selectedSlots.length) {
      onApply(tray.map((p, index) => (nextReplacements[index] ? nextReplacements[index] : p)) as Tray);
      return;
    }

    setReplacements(nextReplacements);
    setChooseIndex(nextIndex);
    setOptions(nextOptions());
  }

  return (
    <div className="reroll-backdrop" role="dialog" aria-modal="true" aria-labelledby="reroll-title">
      <section className="reroll-panel">
        <div className="reroll-heading">
          <span>Reroll</span>
          <strong id="reroll-title">{step === "select" ? "리롤할 블록 선택" : "새 블록 선택"}</strong>
        </div>

        {step === "select" ? (
          <>
            <p className="reroll-hint">
              블록 {count}개 선택 ({selectedSlots.length}/{count})
            </p>
            <div className="reroll-row">
              {filledSlots.map((slotIndex) => {
                const piece = tray[slotIndex];
                const isSelected = selectedSlots.includes(slotIndex);
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`reroll-piece ${isSelected ? "selected" : ""}`}
                    key={piece!.uid}
                    onClick={() => toggleSlot(slotIndex)}
                    type="button"
                  >
                    <PieceShape piece={piece!} />
                  </button>
                );
              })}
            </div>
            <div className="reroll-actions">
              <button className="reroll-cancel" onClick={onCancel} type="button">
                취소
              </button>
              <button
                className="reroll-confirm"
                disabled={selectedSlots.length !== count}
                onClick={confirmSelection}
                type="button"
              >
                {mode === "random" ? "리롤" : "다음"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="reroll-hint">
              {chooseIndex + 1} / {selectedSlots.length} 번째 블록 — 원하는 블록을 고르세요
            </p>
            <div className={`reroll-options ${mode === "deck" ? "deck" : ""}`}>
              {options.map((piece) => (
                <button
                  className="reroll-piece"
                  key={piece.uid}
                  onClick={() => pickReplacement(piece)}
                  type="button"
                >
                  <PieceShape piece={piece} />
                </button>
              ))}
            </div>
            <div className="reroll-actions">
              <button className="reroll-cancel" onClick={onCancel} type="button">
                취소
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default RerollModal;
