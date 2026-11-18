import { Smile } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { EMOTE_IDS, EMOTE_LABELS } from "../features/matchLobby";
import type { EmoteId } from "../features/matchLobby";
import EmoteIcon from "./EmoteIcon";

interface EmotePickerProps {
  disabled?: boolean;
  onPick: (emote: EmoteId) => void;
}

// A small toggle that opens the six emotes in a 2×3 grid above it.
function EmotePicker({ disabled = false, onPick }: EmotePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const popupId = useId();

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLButtonElement>(".emote-option")?.focus();
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div className="emote-picker" ref={rootRef}>
      {open && (
        <div aria-label="감정표현" className="emote-popup" id={popupId} role="group">
          {EMOTE_IDS.map((emote) => (
            <button
              aria-label={EMOTE_LABELS[emote]}
              className="emote-option"
              key={emote}
              onClick={() => {
                onPick(emote);
                setOpen(false);
                toggleRef.current?.focus();
              }}
              title={EMOTE_LABELS[emote]}
              type="button"
            >
              <EmoteIcon emote={emote} size={40} />
            </button>
          ))}
        </div>
      )}
      <button
        aria-controls={open ? popupId : undefined}
        aria-expanded={open}
        aria-label="감정표현 열기"
        className="emote-toggle"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        ref={toggleRef}
        title="감정표현"
        type="button"
      >
        <Smile aria-hidden="true" size={22} />
      </button>
    </div>
  );
}

export default EmotePicker;
