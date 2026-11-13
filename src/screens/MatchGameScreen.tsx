import { Flag, Swords, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AuthUser } from "../api/auth";
import Board from "../components/Board";
import EmoteIcon from "../components/EmoteIcon";
import EmotePicker from "../components/EmotePicker";
import MatchLobby from "../components/MatchLobby";
import PieceShape from "../components/PieceShape";
import PieceTray from "../components/PieceTray";
import RivalHeldPiece from "../components/RivalHeldPiece";
import { CLEAR_HIGHLIGHT_MS, MAX_SNAP_DISTANCE } from "../constants/config";
import { CLEAR_TIER_LABEL, getClearTier } from "../features/clearFeedback";
import { clearActiveRoom } from "../features/activeRoomStorage";
import { EMPTY_CURSOR, FINISH_REASON_LABELS, getCursorPreview, ROOM_CLOSED_MESSAGES } from "../features/matchGame";
import { MatchRoomApiError, matchRoomApi } from "../features/matchroomApi";
import type { MatchCursor, MatchGameState } from "../features/matchGame";
import type { MatchRoomDetails } from "../features/matchroom";
import { canSendEmote, EMOTE_LABELS } from "../features/matchLobby";
import type { EmoteId } from "../features/matchLobby";
import type { EmoteBubble } from "../hooks/useEmoteBubbles";
import { useComboEffect } from "../hooks/useComboEffect";
import { useEmoteBubbles } from "../hooks/useEmoteBubbles";
import { useGameAudio } from "../hooks/useGameAudio";
import { useMatchGame } from "../hooks/useMatchGame";
import { usePieceSelection } from "../hooks/usePieceSelection";
import { usePulseLabel } from "../hooks/usePulseLabel";
import { canPlace, getClosestPlacement, getPlacementDistanceSquared, getPlacementPreview } from "../utils/placement";
import "../styles/GameOver.css";
// Emote picker and bubble animation styles live with the lobby.
import "../styles/MatchLobby.css";
import "../styles/MatchGameScreen.css";
import type { Board as BoardType, PieceInstance } from "../types";

const NO_CELLS = new Set<string>();
const PLACE_TIMEOUT_MS = 3000;
const TURN_START_MS = 1000;
const EMPTY_BOARD: BoardType = Array.from({ length: 8 }, () => Array<null>(8).fill(null));

interface MatchGameScreenProps {
  onExit: () => void;
  room: MatchRoomDetails;
  user: AuthUser;
}

function BoardEmoteBubble({ bubble, nickname }: { bubble?: EmoteBubble; nickname: string }) {
  if (!bubble) return null;
  return (
    <div aria-label={`${nickname}: ${EMOTE_LABELS[bubble.emote]}`} className="match-emote-bubble" key={bubble.key} role="img">
      <EmoteIcon emote={bubble.emote} size={44} />
    </div>
  );
}

interface PlayerTimerProps {
  isMe: boolean;
  isTurn: boolean;
  nickname: string;
  remainingMs: number;
  turnLimitMs: number;
}

/** Fighting-game style turn clock over a player's board: it drains only while that player is on turn
    and otherwise sits full, waiting. */
function PlayerTimer({ isMe, isTurn, nickname, remainingMs, turnLimitMs }: PlayerTimerProps) {
  const leftMs = isTurn ? remainingMs : turnLimitMs;
  const ratio = turnLimitMs > 0 ? Math.min(1, leftMs / turnLimitMs) : 0;
  return (
    <div className={`match-player-timer${isMe ? " is-mine" : " is-rival"}${isTurn ? " is-running" : ""}`}>
      <div
        aria-label={`${nickname} 차례 남은 시간`}
        aria-valuemax={turnLimitMs}
        aria-valuemin={0}
        aria-valuenow={Math.round(leftMs)}
        className="hard-timer match-player-timer-bar"
        role="progressbar"
      >
        <span className="hard-timer-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="match-player-timer-seconds">{(leftMs / 1000).toFixed(1)}</span>
    </div>
  );
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
  // Only the latest relayed cursor matters; it is shown on the rival's board while it is their turn.
  const [rivalCursor, setRivalCursor] = useState<MatchCursor | null>(null);
  const onCursor = useCallback((userId: string, cursor: MatchCursor) => {
    if (userId !== user.id) setRivalCursor(cursor);
  }, [user.id]);
  const match = useMatchGame(room.roomId, { onEmote, onCursor });
  const [lastEmoteAt, setLastEmoteAt] = useState<number | null>(null);
  const { game } = match;
  const [remainingMs, setRemainingMs] = useState(0);
  const [clearingCells, setClearingCells] = useState<Set<string>>(NO_CELLS);
  const [clearingUserId, setClearingUserId] = useState<string | null>(null);
  const rivalBoardRef = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
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
  // Each time the turn passes to me (the first turn included), "MY TURN" bursts in the middle of
  // the screen for TURN_START_MS; the border glow of the on-turn board stays on for the whole turn.
  const { label: turnLabel, pulseId: turnLabelId, pulse: pulseTurnLabel } = usePulseLabel(TURN_START_MS);
  const wasMyTurnRef = useRef(false);
  useEffect(() => {
    if (myTurn && !wasMyTurnRef.current) pulseTurnLabel("MY TURN");
    wasMyTurnRef.current = myTurn;
  }, [myTurn, pulseTurnLabel]);
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

  // Tell the rival what I hold and where it would land; the hook throttles and skips repeats.
  const { sendCursor } = match;
  const heldUid = canMove ? selection.selectedPiece?.uid ?? null : null;
  const aimed = heldUid && !selection.invalidPreview ? selection.closestPlacementCell : null;
  const aimedRow = aimed?.row ?? null;
  const aimedCol = aimed?.col ?? null;
  useEffect(() => {
    if (!playing) return;
    sendCursor(heldUid ? { pieceUid: heldUid, row: aimedRow, col: aimedCol } : EMPTY_CURSOR);
  }, [playing, heldUid, aimedRow, aimedCol, sendCursor]);

  // A cursor from an earlier turn must not linger into the next one.
  const turnUserId = game?.turnUserId;
  useEffect(() => {
    setRivalCursor(null);
  }, [turnUserId]);
  const rivalTurn = Boolean(playing && rival && game?.turnUserId === rival.userId);
  const rivalPreview = useMemo(
    () => (rivalTurn && game ? getCursorPreview(rivalCursor, game.tray) : null),
    [game, rivalCursor, rivalTurn]
  );
  // The same landing preview as my own drag: covered cells (plus what a fill block fills in) and
  // the lines it will clear, worked out on the rival's board.
  const rivalBoard = rival?.board;
  const rivalAimRow = rivalCursor?.row ?? null;
  const rivalAimCol = rivalCursor?.col ?? null;
  const rivalPlacement = useMemo(() => {
    if (!rivalPreview || !rivalBoard || rivalAimRow === null || rivalAimCol === null) return null;
    if (!canPlace(rivalBoard, rivalPreview.piece, rivalAimRow, rivalAimCol)) return null;
    return getPlacementPreview(rivalBoard, rivalPreview.piece, rivalAimRow, rivalAimCol);
  }, [rivalPreview, rivalBoard, rivalAimRow, rivalAimCol]);

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

  function pickEmote(emote: EmoteId) {
    const now = Date.now();
    if (!canSendEmote(lastEmoteAt, now)) return;
    setLastEmoteAt(now);
    showEmote(user.id, emote);
    match.sendEmote(emote);
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

  const won = game.winnerUserId === user.id;
  const selectedPiece = selection.selectedPiece;
  // Seconds left are shown on each board's own timer, so the top bar only says whose turn it is.
  const turnText = !playing ? "게임 종료" : myTurn ? "내 차례" : `${rival.nickname}님의 차례`;

  return (
    <main className={`app-shell play-shell match-shell${selection.cursorPoint ? " has-cursor-piece" : ""}`}>
      {playing && (
        <div className="match-corner-actions">
          <EmotePicker disabled={!match.connected} onPick={pickEmote} />
          <button className="secondary-action match-forfeit" onClick={match.forfeit} type="button">
            <Flag aria-hidden="true" size={18} />기권
          </button>
        </div>
      )}
      {turnLabel && <div className="combo-burst match-turn-burst" key={turnLabelId} aria-hidden="true">{turnLabel}</div>}
      <section className="game-area match-area">
        <header className="match-topbar">
          <div className={`bonus-status hard-status match-turn-status${myTurn ? " is-active" : ""}`}>
            <span><Swords aria-hidden="true" size={16} /> 1:1 대전</span>
            <strong aria-live="polite" role="status">{turnText}</strong>
            {!match.connected && playing && <span className="match-reconnecting"><WifiOff aria-hidden="true" size={14} />재연결 중…</span>}
          </div>
        </header>
        {/* Both boards share one size and sit side by side in the server's player order, so both
            players see the same layout. Whoever is on turn has their board glow for the whole turn. */}
        <div className="match-arena" ref={arenaRef}>
          {game.players.map((player, index) => {
            const isMe = player.userId === user.id;
            const seat = index === 0 ? "is-first" : "is-second";
            const isTurn = playing && game.turnUserId === player.userId;
            const timer = (
              <PlayerTimer
                isMe={isMe}
                isTurn={isTurn}
                nickname={player.nickname}
                remainingMs={remainingMs}
                turnLimitMs={player.turnLimitMs}
              />
            );
            return isMe ? (
              <section aria-label="내 보드" className={`match-player is-me ${seat}${isTurn ? " is-turn" : ""}`} key={player.userId}>
                {timer}
                <div className="match-player-heading">
                  <strong>{me.nickname}</strong>
                  <span className="match-player-tag">나</span>
                  <span className="match-player-score">{me.score.toLocaleString()}점</span>
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
                  <BoardEmoteBubble bubble={emoteBubbles.bubbles[user.id]} nickname={me.nickname} />
                </div>
              </section>
            ) : (
              <section aria-label="상대 보드" className={`match-player is-rival ${seat}${isTurn ? " is-turn" : ""}`} key={player.userId}>
                {timer}
                <div className="match-player-heading">
                  <strong>{rival.nickname}</strong>
                  <span className="match-player-score">{rival.score.toLocaleString()}점</span>
                  {!rival.connected && <span className="match-disconnected"><WifiOff aria-hidden="true" size={14} />연결 끊김</span>}
                  {rivalPreview && <span className="match-rival-holding">블록 고르는 중…</span>}
                </div>
                <div className="board-combo-stage">
                  <Board
                    board={rival.board}
                    boardRef={rivalBoardRef}
                    clearingCells={clearingUserId === rival.userId ? clearingCells : NO_CELLS}
                    hoverCell={null}
                    onCellClick={() => undefined}
                    onCellEnter={() => undefined}
                    onCellLeave={() => undefined}
                    previewCells={rivalPlacement?.cells ?? NO_CELLS}
                    previewClearingCells={rivalPlacement?.clearingCells ?? NO_CELLS}
                    selectedPiece={rivalPreview?.piece ?? null}
                  />
                  <BoardEmoteBubble bubble={emoteBubbles.bubbles[rival.userId]} nickname={rival.nickname} />
                </div>
              </section>
            );
          })}
          <PieceTray
            disabled={!canMove}
            onEmptySlotClick={selection.clearSelection}
            onPieceActivate={selection.handlePieceActivate}
            onPieceSelect={selection.handlePieceSelect}
            // On the rival's turn my tray is disabled, so its highlight shows the block they hold.
            selectedId={myTurn ? selectedPiece?.uid ?? null : rivalPreview?.piece.uid ?? null}
            tray={game.tray}
          />
          {rivalPreview && rivalCursor && (
            <RivalHeldPiece
              arenaRef={arenaRef}
              boardRef={rivalBoardRef}
              // A new piece starts over from its own slot.
              key={rivalPreview.piece.uid}
              piece={rivalPreview.piece}
              slotIndex={game.tray.findIndex((slot) => slot?.uid === rivalPreview.piece.uid)}
              target={rivalCursor.row !== null && rivalCursor.col !== null ? { row: rivalCursor.row, col: rivalCursor.col } : null}
            />
          )}
        </div>
        {match.message && <p className="match-error" role="alert">{match.message}</p>}
        <p className="placement-hint" aria-live="polite">
          {!myTurn ? "상대 차례에는 블록을 놓을 수 없어요"
            : selectedPiece ? "놓을 칸을 누르세요 · 블록을 다시 누르면 선택 취소" : "블록을 끌어 놓거나, 블록과 놓을 칸을 차례로 누르세요"}
        </p>
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
