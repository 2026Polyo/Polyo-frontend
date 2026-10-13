import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import "../styles/ItemSlots.css";
import { itemDetails } from "../features/items";
import type { ItemSlots as ItemSlotsState, ItemType, UndoSnapshot } from "../types";

interface ItemSlotsProps {
  isClearing: boolean;
  itemSlots: ItemSlotsState;
  onItemClick: (item: ItemType | null, index: number) => void;
  undoSnapshot: UndoSnapshot | null;
}

export function ItemSlots({ isClearing, itemSlots, onItemClick, undoSnapshot }: ItemSlotsProps) {
  const [selection, setSelection] = useState<{ item: ItemType; index: number } | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const slotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const detailId = useId();
  const activeSelection = selection && itemSlots[selection.index] === selection.item ? selection : null;
  const activeDetails = activeSelection ? itemDetails[activeSelection.item] : null;
  const disabledReason = isClearing
    ? "블록 효과가 끝나면 사용할 수 있어요."
    : activeSelection?.item === "undo" && !undoSnapshot
      ? "블록을 배치한 뒤 사용할 수 있어요."
      : null;

  function closeDetails() {
    if (activeSelection) slotRefs.current[activeSelection.index]?.focus();
    setSelection(null);
  }

  useEffect(() => {
    if (!selection) return;

    function handleOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target)) setSelection(null);
    }

    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [selection]);

  return (
    <section
      className="undo-items"
      aria-label="아이템 칸"
      onKeyDown={(event) => {
        if (event.key === "Escape" && activeSelection) {
          event.stopPropagation();
          closeDetails();
        }
      }}
      ref={panelRef}
    >
      <header className="undo-items-head">
        <strong>아이템</strong>
      </header>
      <div className="undo-item-row">
        {itemSlots.map((item, index) => {
          const details = item ? itemDetails[item] : null;
          const Icon = details?.Icon;
          const isActive = activeSelection?.index === index;
          const isUnavailable = isClearing || (item === "undo" && !undoSnapshot);

          return (
            <button
              aria-controls={isActive ? detailId : undefined}
              aria-expanded={item ? isActive : undefined}
              aria-label={details ? `${details.label} 설명${isUnavailable ? ", 지금은 사용 불가" : ""}` : `빈 아이템 칸 ${index + 1}`}
              className={`undo-item ${item ? "available" : "empty"}${isActive ? " active" : ""}${isUnavailable && item ? " unavailable" : ""}`}
              disabled={!item}
              key={index}
              onClick={() => {
                if (item) setSelection(isActive ? null : { item, index });
              }}
              ref={(element) => { slotRefs.current[index] = element; }}
              type="button"
            >
              {details ? (
                <>
                  <span className="undo-item-icon">{Icon && <Icon size={34} aria-hidden="true" />}</span>
                  <span className="undo-item-label">{details.label}</span>
                  <span className="undo-item-count">{details.quantity}</span>
                </>
              ) : <span className="undo-item-empty-label">빈 칸</span>}
            </button>
          );
        })}
      </div>
      {activeSelection && activeDetails && (
        <div className="undo-item-detail" id={detailId} role="region" aria-label={`${activeDetails.label} 설명`}>
          <div className="undo-item-detail-head">
            <strong>{activeDetails.label}</strong>
            <button className="undo-item-detail-close" onClick={closeDetails} type="button" aria-label="아이템 설명 닫기">
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <p>{activeDetails.description}</p>
          <span className="undo-item-status" aria-live="polite">{disabledReason ?? "사용하면 아이템 1개가 소모돼요."}</span>
          <button
            className="undo-item-use"
            disabled={Boolean(disabledReason)}
            onClick={() => {
              if (disabledReason) return;
              onItemClick(activeSelection.item, activeSelection.index);
              closeDetails();
            }}
            type="button"
          >
            {activeDetails.label} 사용
          </button>
        </div>
      )}
    </section>
  );
}

export default ItemSlots;
