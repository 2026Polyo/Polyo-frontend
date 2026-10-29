import { Check, Layers, LoaderCircle, Lock, Plus, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { FormEvent } from "react";
import RoomOption from "../components/RoomOption";
import RoomTextField from "../components/RoomTextField";
import MatchRoomResult from "../components/MatchRoomResult";
import { getRoomNameLength, ROOM_NAME_MAX_LENGTH } from "../features/matchroom";
import type { CreateRoomHandler } from "../features/matchroom";
import { useCreateRoom } from "../hooks/useCreateRoom";
import "../styles/PieceShape.css";
import "../styles/CreateRoomScreen.css";

const BRAND_BLOCKS = ["cyan", "lime", "amber", "rose", "violet", "blue", "teal", "orange", "pink"];

interface CreateRoomScreenProps {
  onClose: () => void;
  onCreateRoom: CreateRoomHandler;
}

function CreateRoomScreen({ onClose, onCreateRoom }: CreateRoomScreenProps) {
  const room = useCreateRoom(onCreateRoom);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const locked = room.isSubmitting || room.isComplete;

  useEffect(() => { headingRef.current?.focus(); }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.isComposing && !room.isSubmitting) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, room.isSubmitting]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (room.errors.roomName) nameRef.current?.focus();
    void room.submit();
  }

  return (
    <main className="create-room-screen">
      <header className="room-brand">
        <span className="room-wordmark">POLYOMINO</span>
        <span className="room-mode-badge">MULTIPLAYER</span>
      </header>

      <section aria-labelledby="create-room-title" className="create-room-card">
        <aside className="room-invitation">
          <p className="room-eyebrow">PLAY TOGETHER</p>
          <h2>같이할 준비,<br />방 하나면 끝.</h2>
          <p className="room-invitation-description">방을 만들고,<br />친구들을 초대해 보세요.</p>
          <div aria-hidden="true" className="room-brand-blocks">
            {BRAND_BLOCKS.map((color) => <span className={`piece-${color}`} key={color} />)}
          </div>
          <div className="room-private-tip">
            <Lock aria-hidden="true" size={20} />
            <p>친구끼리 모일 땐<br />비공개 방을 선택해 보세요.</p>
          </div>
        </aside>

        <form aria-busy={room.isSubmitting} className="create-room-form" noValidate onSubmit={handleSubmit}>
          <div className="room-form-heading">
            <div>
              <h1 id="create-room-title" ref={headingRef} tabIndex={-1}>방 만들기</h1>
              <p>
                <span className="room-desktop-copy">함께할 사람들을 위한 공간을 만들어 보세요.</span>
                <span className="room-mobile-copy">친구들과 함께할 방을 만들어 보세요.</span>
              </p>
            </div>
            <button aria-label="방 만들기 닫기" className="room-close" disabled={room.isSubmitting} onClick={onClose} type="button">
              <X aria-hidden="true" size={24} />
            </button>
          </div>
          <div className="room-divider" />

          <fieldset className="room-fields" disabled={locked}>
            <legend className="room-sr-only">방 설정</legend>
            <RoomTextField
              autoComplete="off"
              counter={`${getRoomNameLength(room.values.roomName.trim())}/${ROOM_NAME_MAX_LENGTH}`}
              error={room.touched.roomName ? room.errors.roomName : undefined}
              hint="1~30자 · 친구들이 알아볼 수 있는 이름을 지어주세요."
              id="room-name"
              inputRef={nameRef}
              label="방 이름"
              mobileHint="1~30자로 입력해 주세요."
              name="roomName"
              onBlur={() => room.touchField("roomName")}
              onChange={(event) => room.updateValue("roomName", event.target.value)}
              placeholder="예: 가볍게 한 판!"
              required
              value={room.values.roomName}
            />

            <fieldset className="room-choice-group">
              <legend className="room-choice-legend">공개 설정</legend>
              <div className="room-visibility-options">
                <RoomOption checked={!room.values.isPrivate} detail="누구나 참여할 수 있어요" label="공개" mobileDetail="누구나 참여" name="visibility" onChange={() => room.updateValue("isPrivate", false)} value="public" />
                <RoomOption checked={room.values.isPrivate} detail="입장 코드로 참여해요" label="비공개" mobileDetail="입장 코드 필요" name="visibility" onChange={() => room.updateValue("isPrivate", true)} value="private" />
              </div>
            </fieldset>

            <p className="room-public-hint">
              {room.values.isPrivate ? <Lock aria-hidden="true" size={20} /> : <Layers aria-hidden="true" size={20} />}
              {room.values.isPrivate
                ? "목록에는 표시되지만 입장 코드가 있어야 참여할 수 있어요. 코드는 방을 만들면 발급돼요."
                : "공개 방은 누구나 참여할 수 있어요. 방을 만들면 초대할 입장 코드도 발급돼요."}
            </p>
          </fieldset>

          {room.submissionError && (
            <div className="room-notice room-notice-error" role="alert">
              <strong>방 생성 중 문제가 생겼어요.</strong>
              <p>{room.submissionError}</p>
            </div>
          )}
          {room.createdRoom && <MatchRoomResult room={room.createdRoom} title="방을 만들었어요." />}

          <div className="room-actions">
            <button className="secondary-action room-cancel" disabled={room.isSubmitting} onClick={onClose} type="button">{room.isComplete ? "닫기" : "취소"}</button>
            <button className="primary-action room-submit" disabled={!room.isValid || locked} type="submit">
              {room.isSubmitting ? <LoaderCircle aria-hidden="true" className="room-spinner" size={24} /> : room.isComplete ? <Check aria-hidden="true" size={24} /> : <Plus aria-hidden="true" size={24} />}
              {room.isSubmitting ? "방 만드는 중…" : room.isComplete ? "생성 완료" : room.submissionError ? "다시 시도" : "방 만들기"}
            </button>
          </div>
          <span aria-live="polite" className="room-sr-only">{room.isSubmitting ? "방을 만들고 있어요. 잠시만 기다려 주세요." : ""}</span>
        </form>
      </section>
      <p className="room-page-hint">설정을 확인한 뒤 방 만들기를 눌러주세요.</p>
    </main>
  );
}

export default CreateRoomScreen;
