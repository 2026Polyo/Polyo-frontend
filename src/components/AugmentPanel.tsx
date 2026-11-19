import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X } from "lucide-react";
import "../styles/AugmentPanel.css";
import { augmentDetails } from "../features/augmentData";
import { getAugmentLevel } from "../features/augments";
import type { AugmentDetailWithLevel, AugmentId, AugmentState } from "../types";

interface AugmentPanelProps {
  augmentState: AugmentState;
}

export function AugmentPanel({ augmentState }: AugmentPanelProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeAugmentId, setActiveAugmentId] = useState<AugmentId | null>(null);
  const [previewAugmentId, setPreviewAugmentId] = useState<AugmentId | null>(null);
  const contentId = useId();
  const detailId = useId();
  const sheetId = useId();
  const hudButtonRef = useRef<HTMLButtonElement>(null);
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
      className="augment-panel"
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
          aria-controls={sheetOpen ? sheetId : undefined}
          aria-expanded={sheetOpen}
          aria-haspopup="dialog"
          aria-label={`보유 증강 ${ownedAugments.length}개 보기`}
          className="augment-hud-button"
          onClick={() => setSheetOpen(true)}
          ref={hudButtonRef}
          type="button"
        >
          <Sparkles size={18} aria-hidden="true" />
          <span>증강</span>
          <strong>{ownedAugments.length}</strong>
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
      {sheetOpen && (
        <AugmentSheet
          augments={ownedAugments}
          id={sheetId}
          onClose={() => {
            setSheetOpen(false);
            hudButtonRef.current?.focus();
          }}
        />
      )}
    </section>
  );
}

interface AugmentSheetProps {
  augments: AugmentDetailWithLevel[];
  id: string;
  onClose: () => void;
}

/** Bottom sheet listing every owned augment (icon, name, level, effect) for the compact mobile HUD. */
function AugmentSheet({ augments, id, onClose }: AugmentSheetProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const listRef = useRef<HTMLUListElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);

  // Show the bottom fade only while there is more list below the visible area.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const updateMoreBelow = () => setMoreBelow(list.scrollTop + list.clientHeight < list.scrollHeight - 1);
    updateMoreBelow();
    list.addEventListener("scroll", updateMoreBelow, { passive: true });
    const observer = new ResizeObserver(updateMoreBelow);
    observer.observe(list);
    return () => {
      list.removeEventListener("scroll", updateMoreBelow);
      observer.disconnect();
    };
  }, [augments.length]);

  // Focus the close button once on open; game re-renders must not steal focus back.
  useEffect(() => {
    closeButtonRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return createPortal(
    <div className="augment-sheet-backdrop" onClick={onClose}>
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="augment-sheet"
        id={id}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <span className="augment-sheet-grabber" aria-hidden="true" />
        <header className="augment-sheet-head">
          <h2 id={titleId}>보유 증강 <span>{augments.length}개</span></h2>
          <button aria-label="증강 목록 닫기" className="augment-sheet-close" onClick={onClose} ref={closeButtonRef} type="button">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        {augments.length > 0 ? (
          <div className={`augment-sheet-scroll${moreBelow ? " has-more-below" : ""}`}>
          <ul className="augment-sheet-list" ref={listRef}>
            {augments.map(({ Icon, id: augmentId, label, level, summary }) => (
              <li className="augment-sheet-item" key={augmentId}>
                <span className="augment-sheet-icon">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <div className="augment-sheet-copy">
                  <strong>{label} <span className="augment-sheet-level">Lv.{level}</span></strong>
                  <p>{summary}</p>
                </div>
              </li>
            ))}
          </ul>
          </div>
        ) : <p className="augment-sheet-empty">아직 획득한 증강이 없어요.</p>}
      </div>
    </div>,
    document.body
  );
}

export default AugmentPanel;
