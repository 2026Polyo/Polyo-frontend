import "../styles/AugmentChoiceModal.css";
import { useMemo } from "react";
import PieceShape from "./PieceShape";
import { SPECIAL_LABELS, SPECIAL_SUMMARIES } from "../features/specials";
import { createPieceInstance, pieceBounds } from "../utils/pieceUtils";
import type { PieceTemplate, SpecialType } from "../types";

interface SpecialChoiceModalProps {
  choices: PieceTemplate[];
  onChoose: (template: PieceTemplate) => void;
}

function SpecialChoiceModal({ choices, onChoose }: SpecialChoiceModalProps) {
  const previews = useMemo(
    () => choices.map((template) => ({ template, preview: createPieceInstance(template) })),
    [choices]
  );

  return (
    <div className="augment-choice-backdrop" role="dialog" aria-modal="true" aria-labelledby="special-choice-title">
      <section className="augment-choice-panel">
        <div className="augment-choice-heading">
          <strong id="special-choice-title">블록 해금</strong>
        </div>
        <div className="augment-choice-list">
          {previews.map(({ template, preview }) => {
            const special = template.special as SpecialType | undefined;
            const bounds = pieceBounds(preview);
            const longestSide = Math.max(bounds.rows, bounds.cols);
            const cellSize = Math.min(20, Math.floor((60 - (longestSide - 1) * 2) / longestSide));
            const label = special ? SPECIAL_LABELS[special] : "기본 블록";
            return (
              <button
                aria-label={`${label}, ${bounds.cols}열 ${bounds.rows}행 ${preview.cells.length}칸 해금`}
                className="augment-choice-card special-choice-card new"
                key={preview.uid}
                onClick={() => onChoose(template)}
                type="button"
              >
                <span className="augment-choice-new">신규</span>
                <span className="augment-choice-icon special-choice-shape">
                  <PieceShape cellSize={cellSize} cellGap={2} piece={preview} />
                </span>
                <span className="augment-choice-title">{label}</span>
                <span className="augment-choice-summary">
                  {special ? SPECIAL_SUMMARIES[special] : "이 블록을 덱에 해금합니다."}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default SpecialChoiceModal;
