import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Hash,
  LoaderCircle,
  Lock,
  LogIn,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import JoinRoomDialog from "../components/JoinRoomDialog";
import type { MatchRoomApi, MatchRoomDetails } from "../features/matchroom";
import { useMatchRoomLobby } from "../hooks/useMatchRoomLobby";
import "../styles/CreateRoomScreen.css";
import "../styles/MultiplayerScreen.css";

interface MultiplayerScreenProps {
  api: MatchRoomApi;
  onBack: () => void;
  onCreateRoom: () => void;
  onEnterRoom: (room: MatchRoomDetails) => void;
}

function MultiplayerScreen({
  api,
  onBack,
  onCreateRoom,
  onEnterRoom,
}: MultiplayerScreenProps) {
  const lobby = useMatchRoomLobby(api);
  const [codeOpen, setCodeOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const codeTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [lobby.page]);

  // A joined room goes straight to its waiting room instead of a confirmation step.
  useEffect(() => {
    if (lobby.joinedRoom) onEnterRoom(lobby.joinedRoom);
  }, [lobby.joinedRoom, onEnterRoom]);

  function openCode(trigger: HTMLElement) {
    if (lobby.joining) return;
    codeTriggerRef.current = trigger;
    lobby.clearJoinError();
    setCodeOpen(true);
  }

  function closeCode() {
    if (lobby.joining) return;
    setCodeOpen(false);
    requestAnimationFrame(() => codeTriggerRef.current?.focus());
  }

  return (
    <main className="create-room-screen multiplayer-screen">
      <header className="room-brand">
        <span className="room-wordmark">POLYOMINO</span>
        <span className="room-mode-badge">MULTIPLAYER</span>
      </header>
      <section
        aria-labelledby="multiplayer-title"
        className="multiplayer-panel"
      >
        <div className="multiplayer-heading">
          <div className="multiplayer-title-group">
            <button
              aria-label="메인 화면으로"
              className="room-close"
              disabled={lobby.joining}
              onClick={onBack}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={24} />
            </button>
            <div>
              <h1 id="multiplayer-title" ref={headingRef} tabIndex={-1}>
                멀티
              </h1>
              <p>함께할 방을 찾아보세요.</p>
            </div>
          </div>
          <div className="multiplayer-top-actions room-actions">
            <button
              className="secondary-action"
              disabled={lobby.joining}
              id="lobby-join-code"
              onClick={(event) => openCode(event.currentTarget)}
              type="button"
            >
              <Hash aria-hidden="true" size={20} />
              코드로 접속
            </button>
            <button
              className="primary-action room-submit"
              disabled={lobby.joining}
              id="lobby-create-room"
              onClick={onCreateRoom}
              type="button"
            >
              <Plus aria-hidden="true" size={20} />방 만들기
            </button>
          </div>
        </div>
        <div className="room-divider" />

        <>
          <div className="multiplayer-list-heading">
            <div>
              <h2>방 목록</h2>
              <span>
                {lobby.data
                  ? `총 ${lobby.data.totalElements}개 · 최신순`
                  : "최신순"}
              </span>
            </div>
            <button
              className="multiplayer-refresh"
              disabled={lobby.loading || lobby.joining}
              onClick={lobby.refresh}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={18} />
              새로고침
            </button>
          </div>
          {lobby.joinError && !codeOpen && (
            <div className="room-notice room-notice-error" role="alert">
              <p>{lobby.joinError}</p>
            </div>
          )}
          <div aria-busy={lobby.loading} className="multiplayer-list-content">
            {lobby.loading ? (
              <div className="multiplayer-empty" role="status">
                <LoaderCircle
                  aria-hidden="true"
                  className="room-spinner"
                  size={28}
                />
                <p>방 목록을 불러오는 중…</p>
              </div>
            ) : lobby.listError ? (
              <div className="multiplayer-empty">
                <p role="alert">{lobby.listError}</p>
                <button
                  className="secondary-action"
                  onClick={lobby.refresh}
                  type="button"
                >
                  다시 불러오기
                </button>
              </div>
            ) : lobby.data?.rooms.length === 0 ? (
              <div className="multiplayer-empty">
                <Users aria-hidden="true" size={36} />
                <h3>
                  {lobby.page === 0
                    ? "아직 열린 방이 없어요."
                    : "이 페이지에는 방이 없어요."}
                </h3>
                <p>새 방을 만들거나 친구의 코드로 접속해 보세요.</p>
              </div>
            ) : (
              <ul aria-label="방 목록" className="multiplayer-room-list">
                {lobby.data?.rooms.map((room) => (
                  <li className="multiplayer-room" key={room.roomId}>
                    <div
                      aria-hidden="true"
                      className={`multiplayer-room-icon${room.isPrivate ? " is-private" : ""}`}
                    >
                      {room.isPrivate ? (
                        <Lock size={24} />
                      ) : (
                        <Users size={24} />
                      )}
                    </div>
                    <div className="multiplayer-room-info">
                      <div className="multiplayer-room-labels">
                        <span className="multiplayer-badge">
                          {room.isPrivate ? "비공개" : "공개"}
                        </span>
                        <span
                          className={`multiplayer-room-status${room.status === "FULL" ? " is-full" : ""}`}
                        >
                          {room.status === "FULL" ? "정원 가득" : "대기 중"}
                        </span>
                      </div>
                      <h3>{room.roomName}</h3>
                      <p>방장 {room.hostNickname}</p>
                    </div>
                    <div className="multiplayer-room-join">
                      <span aria-label={`참가자 ${room.playerCount}명`}>
                        {room.playerCount}/2명
                      </span>
                      <button
                        aria-label={`${room.roomName} ${room.isPrivate ? "코드로 접속" : "입장"}`}
                        className="secondary-action"
                        disabled={lobby.joining}
                        onClick={(event) => {
                          if (room.isPrivate) openCode(event.currentTarget);
                          else void lobby.joinById(room.roomId);
                        }}
                        type="button"
                      >
                        {lobby.joiningRoomId === room.roomId ? (
                          <LoaderCircle
                            aria-hidden="true"
                            className="room-spinner"
                            size={18}
                          />
                        ) : room.isPrivate ? (
                          <Hash aria-hidden="true" size={18} />
                        ) : (
                          <LogIn aria-hidden="true" size={18} />
                        )}
                        {lobby.joiningRoomId === room.roomId
                          ? "접속 중…"
                          : room.isPrivate
                            ? "코드로 접속"
                            : "입장"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {lobby.data && (lobby.data.totalPages > 0 || lobby.page > 0) && (
            <nav aria-label="방 목록 페이지" className="multiplayer-pagination">
              <button
                aria-label="이전 페이지"
                className="room-close"
                disabled={lobby.page === 0 || lobby.joining}
                onClick={() => lobby.setPage(lobby.page - 1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={20} />
              </button>
              <span>
                {lobby.page < lobby.data.totalPages
                  ? `${lobby.page + 1} / ${lobby.data.totalPages}`
                  : `${lobby.page + 1}페이지`}
              </span>
              <button
                aria-label="다음 페이지"
                className="room-close"
                disabled={
                  lobby.page + 1 >= lobby.data.totalPages || lobby.joining
                }
                onClick={() => lobby.setPage(lobby.page + 1)}
                type="button"
              >
                <ChevronRight aria-hidden="true" size={20} />
              </button>
            </nav>
          )}
        </>
      </section>
      {codeOpen && (
        <JoinRoomDialog
          busy={lobby.joining}
          error={lobby.joinError}
          onClose={closeCode}
          onSubmit={async (entryCode) => {
            const success = await lobby.joinByCode(entryCode);
            if (success) setCodeOpen(false);
            return success;
          }}
        />
      )}
    </main>
  );
}

export default MultiplayerScreen;
