import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import "../styles/AugmentPanel.css";
import { augmentDetails } from "../features/augmentData";
import { getAugmentLevel } from "../features/augments";
import type { AugmentDetailWithLevel, AugmentId, AugmentState } from "../types";

interface AugmentPanelProps {
  augmentState: AugmentState;
}

export function AugmentPanel({ augmentState }: AugmentPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeAugmentId, setActiveAugmentId] = useState<AugmentId | null>(null);
  const [previewAugmentId, setPreviewAugmentId] = useState<AugmentId | null>(null);
  const contentId = useId();
  const detailId = useId();
  const ownedAugments: AugmentDetailWithLevel[] = augmentDetails
    .map((augment) => ({
      ...augment,
      level: getAugmentLevel(augmentState, augment.id)
    }))
    .filter(({ level }) => level > 0);
  const activeAugment = ownedAugments.find(({ id }) => id === (previewAugmentId ?? activeAugmentId));
  const ActiveIcon = activeAugment?.Icon;

  return (
    <section
      className={`augment-panel${isExpanded ? " expanded" : ""}`}
      aria-label="증강"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setActiveAugmentId(null);
          setPreviewAugmentId(null);
        }
      }}
    >
      <header className="augment-panel-head">
        <strong className="augment-panel-desktop-heading">증강 <span>{ownedAugments.length}개</span></strong>
        <button
          className="augment-panel-toggle"
          aria-controls={contentId}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          <strong>증강 <span>{ownedAugments.length}개</span></strong>
          <ChevronDown size={20} aria-hidden="true" />
        </button>
      </header>
      <div className="augment-panel-content" id={contentId}>
        {ownedAugments.length > 0 ? (
          <ul className="augment-list">
            {ownedAugments.map(({ Icon, id, label, level }) => (
              <li className="augment-list-entry" key={id}>
                <button
                  aria-controls={activeAugment?.id === id ? detailId : undefined}
                  aria-expanded={activeAugment?.id === id}
                  aria-label={`${label} ${level}레벨 설명`}
                  className={`augment-card${activeAugment?.id === id ? " active" : ""}`}
                  onBlur={() => setPreviewAugmentId(null)}
                  onFocus={() => setPreviewAugmentId(id)}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") setPreviewAugmentId(id);
                  }}
                  onPointerLeave={() => setPreviewAugmentId(null)}
                  onClick={() => {
                    setPreviewAugmentId(null);
                    setActiveAugmentId((current) => current === id ? null : id);
                  }}
                  type="button"
                >
                  <span className="augment-card-icon">
                    <Icon size={35} aria-hidden="true" />
                  </span>
                  <span className="augment-level">Lv.{level}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="augment-empty">획득한 증강이 여기에 표시돼요.</p>}
        {activeAugment && ActiveIcon && (
          <aside className="augment-detail-panel" id={detailId} aria-live="polite">
            <span className="augment-detail-icon">
              <ActiveIcon size={54} aria-hidden="true" />
            </span>
            <div className="augment-detail-copy">
              <strong>{activeAugment.label}</strong>
              <span>{activeAugment.level}레벨</span>
              <p>{activeAugment.summary}</p>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

export default AugmentPanel;
