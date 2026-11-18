import { Check, Copy, Crown, LoaderCircle, LogOut, Users, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import type { AuthUser } from "../api/auth";
import { canSendEmote, EMOTE_LABELS, getLobbyAction } from "../features/matchLobby";
import type { EmoteId } from "../features/matchLobby";
import type { MatchRoomDetails } from "../features/matchroom";
import type { EmoteBubble } from "../hooks/useEmoteBubbles";
import EmoteIcon from "./EmoteIcon";
import EmotePicker from "./EmotePicker";
import "../styles/CreateRoomScreen.css";
import "../styles/MatchLobby.css";

const START_PENDING_MS = 5000;

type Member = { userId: string; nickname: string };

interface MatchLobbyProps {
  room: MatchRoomDetails;
  user: AuthUser;
  connected: boolean;
  connectedUserIds: string[];
  readyUserIds: string[] | null;
  members?: Member[];
  message: string;
  messageCode: string;
  /** True while the leave request is in flight. */
  exiting?: boolean;
  bubbles: Record<string, EmoteBubble>;
  onEmote: (emote: EmoteId) => void;
  onReady: (ready: boolean) => void;
  onStart: () => void;
  onExit: () => void;
}

interface PlayerProfileProps {
  side: "left" | "right";
  player: Member | null;
  isMe: boolean;
  isHost: boolean;
  online: boolean;
  ready: boolean;
  bubble?: EmoteBubble;
}

function PlayerProfile({ side, player, isMe, isHost, online, ready, bubble }: PlayerProfileProps) {
  if (!player) {
    return (
      <section aria-label="상대 자리" className={`vs-player vs-player-${side} is-empty`}>
        <div className="vs-avatar"><LoaderCircle aria-hidden="true" className="room-spinner" size={40} /></div>
        <strong className="vs-player-name">상대를 기다리는 중…</strong>
        <span className="vs-player-status">입장 코드를 공유해 주세요</span>
      </section>
    );
  }

  const status = !online ? "미접속" : isHost ? "방장" : ready ? "준비 완료" : "준비 중";
  return (
    <section aria-label={isMe ? "나" : "상대"} className={`vs-player vs-player-${side}${ready || isHost ? " is-ready" : ""}${online ? "" : " is-offline"}`}>
      <div className="vs-avatar-wrap">
        <div className="vs-avatar" aria-hidden="true">{Array.from(player.nickname)[0] ?? "?"}</div>
        {isHost && <span className="vs-host-badge" title="방장"><Crown aria-hidden="true" size={18} /></span>}
        {bubble && (
          <div className="vs-emote-bubble" key={bubble.key} role="img" aria-label={`${player.nickname}: ${EMOTE_LABELS[bubble.emote]}`}>
            <EmoteIcon emote={bubble.emote} size={52} />
          </div>
        )}
      </div>
      <span className="vs-player-tag">{isMe ? "나" : "상대"}</span>
      <strong className="vs-player-name">{player.nickname}</strong>
      <span className="vs-player-status">
        {!online ? <WifiOff aria-hidden="true" size={14} /> : (ready && !isHost) ? <Check aria-hidden="true" size={14} /> : null}
        {status}
      </span>
    </section>
  );
}

// 2-player waiting room: both profiles face off around a VS mark, with ready/start, exit and emotes.
function MatchLobby({
  room, user, connected, connectedUserIds, readyUserIds, members, message, messageCode, exiting = false, bubbles,
  onEmote, onReady, onStart, onExit
}: MatchLobbyProps) {
  const [localReady, setLocalReady] = useState(false);
  const [startPending, setStartPending] = useState(false);
  const [lastEmoteAt, setLastEmoteAt] = useState<number | null>(null);
  const [copyMessage, setCopyMessage] = useState("");

  const isHost = room.hostUserId === user.id;
  const knownMembers = members ?? room.members;
  const me: Member = knownMembers.find((member) => member.userId === user.id) ?? { userId: user.id, nickname: user.nickname };
  const rivalId = knownMembers.find((member) => member.userId !== user.id)?.userId
    ?? connectedUserIds.find((id) => id !== user.id) ?? null;
  const rival: Member | null = rivalId
    ? knownMembers.find((member) => member.userId === rivalId) ?? { userId: rivalId, nickname: "상대 플레이어" }
    : null;
  const rivalConnected = rivalId !== null && connectedUserIds.includes(rivalId);
  const myReady = readyUserIds ? readyUserIds.includes(user.id) : localReady;
  const rivalReady = Boolean(rivalId && readyUserIds?.includes(rivalId));
  const action = getLobbyAction({ isHost, connected, rivalConnected, myReady, rivalReady, startPending });
  const playerCount = rival ? 2 : 1;
  // Servers without the ready step answer READY/START/EMOTE with INVALID_MESSAGE; that is not the player's fault.
  const visibleMessage = messageCode === "INVALID_MESSAGE" ? "" : message;

  useEffect(() => {
    if (!startPending) return;
    const timer = setTimeout(() => setStartPending(false), START_PENDING_MS);
    return () => clearTimeout(timer);
  }, [startPending]);

  useEffect(() => {
    if (message) setStartPending(false);
  }, [message]);

  // A ready flag shown without server tracking is dropped once the other player leaves.
  useEffect(() => {
    if (!rivalConnected) setLocalReady(false);
  }, [rivalConnected]);

  function runAction() {
    if (action.disabled) return;
    if (action.type === "start") {
      setStartPending(true);
      onStart();
      return;
    }
    const next = action.type === "ready";
    setLocalReady(next);
    onReady(next);
  }

  function pickEmote(emote: EmoteId) {
    const now = Date.now();
    if (!canSendEmote(lastEmoteAt, now)) return;
    setLastEmoteAt(now);
    onEmote(emote);
  }

  async function copyEntryCode() {
    try {
      await navigator.clipboard.writeText(room.entryCode);
      setCopyMessage("입장 코드를 복사했어요.");
    } catch {
      setCopyMessage("복사하지 못했어요. 코드를 직접 선택해 복사해 주세요.");
    }
  }

  return (
    <main className="create-room-screen vs-lobby">
      <header className="room-brand vs-lobby-header">
        <span className="room-wordmark">POLYOMINO</span>
        <span className="room-mode-badge">1 : 1 대전</span>
      </header>

      <section aria-label="방 정보" className="vs-room-info">
        <div className="vs-room-title">
          <strong>{room.roomName}</strong>
          <span><Users aria-hidden="true" size={16} />{playerCount}/{room.maxPlayers}명</span>
        </div>
        <div className="vs-room-code">
          <label htmlFor="vs-entry-code">입장 코드</label>
          <input id="vs-entry-code" readOnly value={room.entryCode} />
          <button className="room-copy" onClick={() => void copyEntryCode()} type="button"><Copy aria-hidden="true" size={16} />복사</button>
        </div>
        <p aria-live="polite" className="vs-copy-message">{copyMessage}</p>
      </section>

      <section aria-label="대전 상대" className="vs-stage">
        <PlayerProfile bubble={bubbles[user.id]} isHost={isHost} isMe online={connected} player={me} ready={myReady} side="left" />
        <div aria-hidden="true" className="vs-mark">VS</div>
        <PlayerProfile
          bubble={rival ? bubbles[rival.userId] : undefined}
          isHost={Boolean(rival && room.hostUserId === rival.userId)}
          isMe={false}
          online={rivalConnected}
          player={rival}
          ready={rivalReady}
          side="right"
        />
      </section>

      <div aria-live="polite" className="vs-status">
        {!connected ? "서버에 연결하는 중…" : action.hint}
        {visibleMessage && <p className="vs-error" role="alert">{visibleMessage}</p>}
      </div>

      <footer className="vs-actions">
        <div className="vs-actions-left">
          <EmotePicker disabled={!connected} onPick={pickEmote} />
        </div>
        <button
          aria-pressed={action.type === "start" ? undefined : myReady}
          className={`primary-action vs-main-action${action.type === "unready" ? " is-ready" : ""}`}
          disabled={action.disabled}
          onClick={runAction}
          type="button"
        >
          {action.type === "start" && startPending && <LoaderCircle aria-hidden="true" className="room-spinner" size={20} />}
          {action.label}
        </button>
        <div className="vs-actions-right">
          <button className="secondary-action vs-exit" disabled={exiting} onClick={onExit} type="button">
            {exiting ? <LoaderCircle aria-hidden="true" className="room-spinner" size={18} /> : <LogOut aria-hidden="true" size={18} />}
            {exiting ? "나가는 중…" : "나가기"}
          </button>
        </div>
      </footer>
    </main>
  );
}

export default MatchLobby;
