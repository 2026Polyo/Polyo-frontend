import { useState } from "react";
import "../styles/AugmentChoiceModal.css";
import {
  getAugmentEffectText,
  getAugmentLevel,
  getAugmentMaxLevel,
  getNextAugmentScore
} from "../features/augments";
import { AUGMENT_CHOICE_COUNT, AUGMENT_TYPE_LABEL, augmentDetails } from "../features/augmentData";
import { shuffleInPlace } from "../utils/shuffle";
import type { AugmentDetail, AugmentId, AugmentState } from "../types";

// Pick `count` distinct augments at random, excluding any augment that has
// already reached its max level.
function pickRandomAugments(count: number, augmentState: AugmentState): AugmentDetail[] {
  const pool = shuffleInPlace(
    augmentDetails.filter(
      (augment) => getAugmentLevel(augmentState, augment.id) < getAugmentMaxLevel(augment.id)
    )
  );
  return pool.slice(0, Math.min(count, pool.length));
}

interface AugmentChoiceModalProps {
  augmentState: AugmentState;
  onChoose: (id: AugmentId) => void;
  score: number;
}

export function AugmentChoiceModal({ augmentState, onChoose, score }: AugmentChoiceModalProps) {
  // Roll the offered augments once per modal mount so they stay stable while open.
  const [choices] = useState<AugmentDetail[]>(() => pickRandomAugments(AUGMENT_CHOICE_COUNT, augmentState));

  return (
    <div className="augment-choice-backdrop" role="dialog" aria-modal="true" aria-labelledby="augment-choice-title">
      <section className="augment-choice-panel">
        <div className="augment-choice-heading">
          <strong id="augment-choice-title">증강 선택</strong>
        </div>
        <div className="augment-choice-list">
          {choices.map(({ Icon, id, label, summary, type }) => {
            const currentLevel = getAugmentLevel(augmentState, id);
            const nextLevel = currentLevel + 1;
            const isNewAugment = currentLevel === 0;

            return (
              <button
                aria-label={`${label} ${nextLevel}레벨 선택: ${getAugmentEffectText(id, nextLevel)}`}
                className={`augment-choice-card ${isNewAugment ? "new" : ""}`}
                key={id}
                onClick={() => onChoose(id)}
                type="button"
              >
                {isNewAugment && <span className="augment-choice-new">신규</span>}
                <span className={`augment-choice-type type-${type}`}>{AUGMENT_TYPE_LABEL[type]}</span>
                <span className="augment-choice-icon">
                  <Icon size={48} aria-hidden="true" />
                </span>
                <span className="augment-choice-title">
                  {label} {nextLevel > 1 ? `${nextLevel}레벨` : ""}
                </span>
                <span className="augment-choice-summary">{summary}</span>
                <span className="augment-choice-effect">{getAugmentEffectText(id, nextLevel)}</span>
              </button>
            );
          })}
        </div>
        <p className="augment-choice-progress">
          다음 증강까지 목표 점수: {getNextAugmentScore(score, getAugmentLevel(augmentState, "augment-discount"))}
        </p>
      </section>
    </div>
  );
}

export default AugmentChoiceModal;
