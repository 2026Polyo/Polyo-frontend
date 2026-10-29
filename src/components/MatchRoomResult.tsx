import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { MatchRoomDetails } from "../features/matchroom";

interface MatchRoomResultProps {
  room: MatchRoomDetails;
  title: string;
}

function MatchRoomResult({ room, title }: MatchRoomResultProps) {
  const [copyMessage, setCopyMessage] = useState("");

  async function copyEntryCode() {
    try {
      await navigator.clipboard.writeText(room.entryCode);
      setCopyMessage("입장 코드를 복사했어요.");
    } catch {
      setCopyMessage("복사하지 못했어요. 아래 코드를 직접 선택해 복사해 주세요.");
    }
  }

  return (
    <div className="room-notice room-notice-success" role="status">
      <strong><Check aria-hidden="true" size={20} />{title}</strong>
      <p>{room.roomName} · {room.playerCount}/{room.maxPlayers}명</p>
      <label className="room-code-label" htmlFor="joined-room-code">입장 코드</label>
      <div className="room-entry-code">
        <input aria-label="입장 코드" id="joined-room-code" readOnly value={room.entryCode} />
        <button className="room-copy" onClick={() => void copyEntryCode()} type="button"><Copy aria-hidden="true" size={18} />복사</button>
      </div>
      <p>친구에게 코드를 공유해 주세요.</p>
      <p aria-live="polite">{copyMessage}</p>
    </div>
  );
}

export default MatchRoomResult;
