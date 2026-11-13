import { Flag, Swords, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthUser } from "../api/auth";
import Board from "../components/Board";
import MatchLobby from "../components/MatchLobby";
import PieceShape from "../components/PieceShape";
import PieceTray from "../components/PieceTray";
import ScoreBoard from "../components/ScoreBoard";
import { ThemeScope } from "../components/ThemeScope";
import { CLEAR_HIGHLIGHT_MS, MAX_SNAP_DISTANCE } from "../constants/config";
import { CLEAR_TIER_LABEL, getClearTier } from "../features/clearFeedback";
import { clearActiveRoom } from "../features/activeRoomStorage";
import { FINISH_REASON_LABELS, ROOM_CLOSED_MESSAGES } from "../features/matchGame";
import { MatchRoomApiError, matchRoomApi } from "../features/matchroomApi";
import type { MatchGameState } from "../features/matchGame";
import type { MatchRoomDetails } from "../features/matchroom";
import type { EmoteId } from "../features/matchLobby";
import { useComboEffect } from "../hooks/useComboEffect";
import { useEmoteBubbles } from "../hooks/useEmoteBubbles";
import { useGameAudio } from "../hooks/useGameAudio";
import { useMatchGame } from "../hooks/useMatchGame";
import { usePieceSelection } from "../hooks/usePieceSelection";
import { usePulseLabel } from "../hooks/usePulseLabel";
import { getClosestPlacement, getPlacementDistanceSquared } from "../utils/placement";
import "../styles/GameOver.css";
import "../styles/MatchGameScreen.css";
import type { Board as BoardType, PieceInstance } from "../types";

const NO_CELLS = new Set<string>();
const PLACE_TIMEOUT_MS = 3000;
const EMPTY_BOARD: BoardType = Array.from({ length: 8 }, () => Array<null>(8).fill(null));

interface MatchGameScreenProps {
  onExit: () => void;
  room: MatchRoomDetails;
  user: AuthUser;
}

/** Changes exactly when some board changed, i.e. once per applied move. */
function moveSignature(game: MatchGameState | null): string {
  return game ? game.players.map((player) => `${player.score}:${player.board.flat().join(",")}`).join("|") : "";
}

// The match plays on the same board, tray, score and effects as solo mode; only the state comes from the server.
function MatchGameScreen({ onExit, room, user }: MatchGameScreenProps) {
  const emoteBubbles = useEmoteBubbles();
  const showEmote = emoteBubbles.show;
  // My own emote is shown right away, so a server echo of it is ignored.
  const onEmote = useCallback((userId: string, emote: EmoteId) => {
    if (userId !== user.id) showEmote(userId, emote);
  }, [showEmote, user.id]);
  const match = useMatchGame(room.roomId, { onEmote });
  const { game } = match;
  const [remainingMs, setRemainingMs] = useState(0);
  const [clearingCells, setClearingCells] = useState<Set<string>>(NO_CELLS);
  const [clearingUserId, setClearingUserId] = useState<string | null>(null);
  const rivalBoardRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const leaveControllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => leaveControllerRef.current?.abort(), []);
  const audio = useGameAudio();
  const { label: clearLabel, pulseId: clearLabelId, pulse: pulseClearLabel } = usePulseLabel();

  const me = game?.players.find((player) => player.userId === user.id);
  const rival = game?.players.find((player) => player.userId !== user.id);
  const playing = game?.status === "PLAYING";
  const myTurn = Boolean(playing && game?.turnUserId === user.id);
  // True from sending PLACE until the server answers, so a second drop cannot send a duplicate move.
  const [placing, setPlacing] = useState(false);
  const canMove = myTurn && !placing;
  const myBoard = me?.board ?? EMPTY_BOARD;
  const availablePieces = useMemo(
    () => (canMove && game ? game.tray.filter((piece): piece is PieceInstance => piece !== null) : []),
    [game, canMove]
  );

  useEffect(() => {
    setPlacing(false);
  }, [game, match.message]);

  useEffect(() => {
    if (!placing) return undefined;
    // Fallback for an answer that never changes state (e.g. the same error twice).
    const timer = setTimeout(() => setPlacing(false), PLACE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [placing]);

  // usePieceSelection calls this on drop; the piece leaves the tray when the server's next state arrives.
  const clearSelectionRef = useRef<() => void>(() => undefined);
  const onPlace = useCallback((piece: PieceInstance, row: number, col: number) => {
    audio.resume();
    setPlacing(true);
    match.place(piece.uid, row, col);
    clearSelectionRef.current();
  }, [audio, match]);

  const selection = usePieceSelection({
    augmentChoiceOpen: false,
    availablePieces,
    board: myBoard,
    isPlaying: canMove,
    onPlace
  });
  clearSelectionRef.current = selection.clearSelection;
  const comboEffectValue = useComboEffect(me?.combo ?? 0);

  // The server sends time left rather than a clock, so the countdown ignores clock differences.
  useEffect(() => {
    if (!game || game.status !== "PLAYING") return;
    const endsAt = performance.now() + game.turnRemainingMs;
    const tick = () => setRemainingMs(Math.max(0, endsAt - performance.now()));
    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [game]);

  // Same feedback as solo play after each move: sound, clear highlight and the good/great/excellent label.
  const signature = moveSignature(game);
  const lastSignatureRef = useRef("");
  useEffect(() => {
    const previous = lastSignatureRef.current;
    lastSignatureRef.current = signature;
    const move = game?.lastMove;
    if (!previous || !move || previous === signature) return undefined;
    audio.playPlacement();
    if (move.cleared === 0) return undefined;
    audio.playClearFeedback(move.cleared);
    if (move.userId === user.id) {
      const tier = getClearTier(move.cleared);
      if (tier) pulseClearLabel(CLEAR_TIER_LABEL[tier]);
    }
    setClearingUserId(move.userId);
    setClearingCells(new Set(move.clearingCells));
    const timer = setTimeout(() => setClearingCells(NO_CELLS), CLEAR_HIGHLIGHT_MS);
    return () => clearTimeout(timer);
    // Keyed on the signature alone: only a new move should replay feedback.
  }, [signature]);

  useEffect(() => {
    if (game?.status !== "FINISHED") return;
    audio.playGameOver();
    // The server deletes a finished room, so a refresh from here should not try to rejoin it.
    clearActiveRoom();
  }, [game?.status]);

  function handleCellClick(row: number, col: number) {
    const piece = selection.selectedPiece;
    if (!canMove || !piece) return;
    const anchor = selection.anchorCell;
    const target = anchor ? { row: row - anchor[0], col: col - anchor[1] } : { row, col };
    const closest = getClosestPlacement(myBoard, piece, target);
    if (!closest || getPlacementDistanceSquared(target, closest) > MAX_SNAP_DISTANCE ** 2) return;
    onPlace(piece, closest.row, closest.col);
  }

  async function leaveRoom() {
    if (leaving) return;
    setLeaving(true);
    setLeaveError("");
    const controller = new AbortController();
    leaveControllerRef.current = controller;
    try {
      // The server deletes the room when the host leaves and tells the guest with ROOM_CLOSED.
      await matchRoomApi.leave(room.roomId, controller.signal);
      onExit();
    } catch (error) {
      if (controller.signal.aborted) return;
      const code = error instanceof MatchRoomApiError ? error.code : "";
      // Already gone or already out: there is nothing left to leave.
      if (code === "ROOM_NOT_FOUND" || code === "ROOM_MEMBER_ONLY") {
        onExit();
        return;
      }
      setLeaveError(error instanceof Error ? error.message : "방에서 나가지 못했어요. 다시 시도해 주세요.");
      setLeaving(false);
    }
  }

  // My own leave also closes my socket with ROOM_CLOSED; that one is not news to me.
  if (match.closedReason && !leaving) {
    return (
      <main className="create-room-screen match-screen">
        <section className="match-waiting">
          <h1>방이 닫혔어요.</h1>
          <p role="alert">{ROOM_CLOSED_MESSAGES[match.closedReason]}</p>
          <button className="primary-action" onClick={onExit} type="button">방 목록으로</button>
        </section>
      </main>
    );
  }

  if (match.fatalError) {
    return (
      <main className="create-room-screen match-screen">
        <section className="match-waiting">
          <h1>대전에 접속하지 못했어요.</h1>
          <p role="alert">{match.fatalError}</p>
          <button className="primary-action" onClick={onExit} type="button">방 목록으로</button>
        </section>
      </main>
    );
  }

  if (!game || !me || !rival) {
    return (
      <MatchLobby
        bubbles={emoteBubbles.bubbles}
        connected={match.connected}
        connectedUserIds={match.connectedUserIds}
        members={match.members}
        exiting={leaving}
        message={leaveError || match.message}
        messageCode={leaveError ? "" : match.messageCode}
        onEmote={(emote) => {
          showEmote(user.id, emote);
          match.sendEmote(emote);
        }}
        onExit={() => void leaveRoom()}
        onReady={match.setReady}
        onStart={match.start}
        readyUserIds={match.readyUserIds}
        room={room}
        user={user}
      />
    );
  }

  const turnLimitMs = (myTurn ? me : rival).turnLimitMs;
  const won = game.winnerUserId === user.id;
  const selectedPiece = selection.selectedPiece;
  const turnText = !playing ? "게임 종료"
    : myTurn ? `내 차례 · ${(remainingMs / 1000).toFixed(1)}초`
      : `${rival.nickname}님의 차례 · ${(remainingMs / 1000).toFixed(1)}초`;

  return (
    <main className={`app-shell play-shell match-shell${selection.cursorPoint ? " has-cursor-piece" : ""}`}>
      {playing && (
        <button className="secondary-action match-forfeit" onClick={match.forfeit} type="button">
          <Flag aria-hidden="true" size={18} />기권
        </button>
      )}
      <section className="game-area">
        <ScoreBoard score={me.score} />
        <div className={`bonus-status hard-status match-turn-status${myTurn ? " is-active" : ""}`}>
          <span><Swords aria-hidden="true" size={16} /> 1:1 대전</span>
          <strong aria-live="polite" role="status">{turnText}</strong>
          {!match.connected && playing && <span className="match-reconnecting"><WifiOff aria-hidden="true" size={14} />재연결 중…</span>}
        </div>
        <div className="board-layout">
          <aside aria-label="상대 보드" className="match-rival">
            <div className={`match-rival-heading${playing && !myTurn ? " is-active" : ""}`}>
              <strong>{rival.nickname}</strong>
              <span>{rival.score.toLocaleString()}점</span>
              {!rival.connected && <span className="match-disconnected"><WifiOff aria-hidden="true" size={14} />연결 끊김</span>}
            </div>
            <ThemeScope themeId="theme_classic">
              <Board
                board={rival.board}
                boardRef={rivalBoardRef}
                clearingCells={clearingUserId === rival.userId ? clearingCells : NO_CELLS}
                hoverCell={null}
                onCellClick={() => undefined}
                onCellEnter={() => undefined}
                onCellLeave={() => undefined}
                previewCells={NO_CELLS}
                previewClearingCells={NO_CELLS}
                selectedPiece={null}
              />
            </ThemeScope>
          </aside>
          <div className="board-stack">
            <div
              aria-label="이번 차례 남은 시간"
              aria-valuemax={turnLimitMs}
              aria-valuemin={0}
              aria-valuenow={Math.round(remainingMs)}
              className={`hard-timer match-turn-timer${myTurn ? "" : " is-rival"}`}
              role="progressbar"
            >
              <span className="hard-timer-fill" style={{ width: `${playing && turnLimitMs > 0 ? (remainingMs / turnLimitMs) * 100 : 0}%` }} />
            </div>
            <div className="board-combo-stage">
              <Board
                board={me.board}
                boardRef={selection.boardRef}
                clearingCells={clearingUserId === me.userId ? clearingCells : NO_CELLS}
                hoverCell={selection.hoverCell}
                onCellClick={handleCellClick}
                onCellEnter={selection.setHoverCell}
                onCellLeave={() => selection.setHoverCell(null)}
                previewCells={selection.previewCells}
                previewClearingCells={selection.previewClearingCells}
                selectedPiece={selectedPiece}
              />
              {comboEffectValue !== null && <div className="combo-burst" aria-live="polite">combo {comboEffectValue}</div>}
              {clearLabel && <div className="clear-burst" key={clearLabelId} aria-live="polite">{clearLabel}</div>}
            </div>
            <PieceTray
              disabled={!canMove}
              onEmptySlotClick={selection.clearSelection}
              onPieceActivate={selection.handlePieceActivate}
              onPieceSelect={selection.handlePieceSelect}
              selectedId={selectedPiece?.uid ?? null}
              tray={game.tray}
            />
            {match.message && <p className="match-error" role="alert">{match.message}</p>}
            <p className="placement-hint" aria-live="polite">
              {!myTurn ? "상대 차례에는 블록을 놓을 수 없어요"
                : selectedPiece ? "놓을 칸을 누르세요 · 블록을 다시 누르면 선택 취소" : "블록을 끌어 놓거나, 블록과 놓을 칸을 차례로 누르세요"}
            </p>
          </div>
        </div>
        {selection.cursorPiece && selection.cursorPoint && selection.cursorAnchorOffset && (
          <div
            className={`cursor-piece ${selection.invalidPreview ? "invalid" : ""}`}
            style={{
              left: selection.cursorPoint.x,
              top: selection.cursorPoint.y,
              transform: `translate(-${selection.cursorAnchorOffset.x}px, -${selection.cursorAnchorOffset.y}px)`
            }}
          >
            <PieceShape
              cellGap={selection.boardMetrics.cellGap}
              cellSize={selection.boardMetrics.cellSize}
              className="cursor-piece-grid"
              piece={selection.cursorPiece}
            />
          </div>
        )}
      </section>

      {!playing && (
        <div className="game-over" role="dialog" aria-modal="true" aria-labelledby="match-result-title">
          <div className="game-over-score" aria-label="내 점수">
            <span>{me.nickname}</span>
            <strong>{me.score}</strong>
          </div>
          <h2 id="match-result-title">{won ? "승리!" : "패배"}</h2>
          <p className="match-result-reason">{game.finishReason ? FINISH_REASON_LABELS[game.finishReason] : ""}</p>
          <div className="game-over-best" aria-label="상대 점수">
            <span>{rival.nickname}</span>
            <strong>{rival.score}</strong>
          </div>
          <div className="game-over-actions">
            <button className="primary-action" onClick={onExit} type="button">방 목록으로</button>
          </div>
        </div>
      )}
    </main>
  );
}

export default MatchGameScreen;
