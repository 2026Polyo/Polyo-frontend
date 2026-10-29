import { LoaderCircle, LogIn, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ENTRY_CODE_PATTERN, normalizeEntryCode } from "../features/matchroom";
import RoomTextField from "./RoomTextField";

interface JoinRoomDialogProps {
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (entryCode: string) => Promise<boolean>;
}

function JoinRoomDialog({ busy, error, onClose, onSubmit }: JoinRoomDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const normalizedCode = normalizeEntryCode(code);
  const valid = ENTRY_CODE_PATTERN.test(normalizedCode);

  useEffect(() => {
    dialogRef.current?.showModal();
    inputRef.current?.focus();
    return () => dialogRef.current?.close();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (valid && !busy) void onSubmit(normalizedCode);
  }

  return (
    <dialog aria-labelledby="join-code-title" className="join-room-dialog" onCancel={(event) => {
      event.preventDefault();
      if (!busy) onClose();
    }} ref={dialogRef}>
      <form aria-busy={busy} className="create-room-form" noValidate onSubmit={submit}>
        <div className="room-form-heading">
          <div><h2 id="join-code-title">코드로 접속</h2><p>친구에게 받은 입장 코드를 입력해 주세요.</p></div>
          <button aria-label="코드 접속 닫기" className="room-close" disabled={busy} onClick={onClose} type="button"><X aria-hidden="true" size={24} /></button>
        </div>
        <RoomTextField
          autoComplete="off" autoCapitalize="characters" spellCheck={false} inputRef={inputRef}
          disabled={busy} id="entry-code" label="입장 코드" name="entryCode" placeholder="예: K7M3PX9Q"
          hint="영문 대문자와 숫자 8자리 · I, O, 0, 1은 사용하지 않아요."
          error={touched && !valid ? "올바른 8자리 입장 코드를 입력해 주세요." : undefined}
          onBlur={() => setTouched(true)} onChange={(event) => setCode(event.target.value)} value={code} required
        />
        {error && <div className="room-notice room-notice-error" role="alert"><p>{error}</p></div>}
        <div className="room-actions">
          <button className="secondary-action room-cancel" disabled={busy} onClick={onClose} type="button">취소</button>
          <button className="primary-action room-submit" disabled={!valid || busy} type="submit">
            {busy ? <LoaderCircle aria-hidden="true" className="room-spinner" size={20} /> : <LogIn aria-hidden="true" size={20} />}
            {busy ? "접속 중…" : "접속"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

export default JoinRoomDialog;
