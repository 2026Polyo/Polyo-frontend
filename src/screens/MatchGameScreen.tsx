import { Flag, LoaderCircle, Timer, Trophy, Users, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AuthUser } from "../api/auth";
import Board from "../components/Board";
import MatchRoomResult from "../components/MatchRoomResult";
import PieceShape from "../components/PieceShape";
import { FINISH_REASON_LABELS } from "../features/matchGame";
import type { MatchPlayerState } from "../features/matchGame";
import type { MatchRoomDetails } from "../features/matchroom";
import { useMatchGame } from "../hooks/useMatchGame";
import { canPlace, getClosestPlacement, getPlacementDistanceSquared } from "../utils/placement";
import { MAX_SNAP_DISTANCE } from "../constants/config";
import "../styles/CreateRoomScreen.css";
import "../styles/MatchGameScreen.css";
import type { PieceInstance, PlacementPosition } from "../types";

const NO_CELLS = new Set<string>();

interface MatchGameScreenProps {
  onExit: () => void;
  room: MatchRoomDetails;
  user: AuthUser;
}

function PlayerHeading({ active, label, player, secondsLeft }: { active: boolean; label: string; player: MatchPlayerState; secondsLeft: string }) {
  return (
    <header className={`match-player-heading${active ? " is-active" : ""}`}>
      <div><span className="match-player-label">{label}</span><strong>{player.nickname}</strong></div>
      <div className="match-player-stats">
        {!player.connected && <span className="match-disconnected"><WifiOff aria-hidden="true" size={16} />연결 끊김</span>}
        {active && <span className="match-timer"><Timer aria-hidden="true" size={16} />{secondsLeft}초</span>}
        <span className="match-score">{player.score.toLocaleString()}점</span>
      </div>
    </header>
  );
}

function MatchGameScreen({ onExit, room, user }: MatchGameScreenProps) {
  const match = useMatchGame(room.roomId);
  const { game } = match;
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<PlacementPosition | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const myBoardRef = useRef<HTMLDivElement>(null);
  const rivalBoardRef = useRef<HTMLDivElement>(null);

  const me = game?.players.find((player) => player.userId === user.id);
  const rival = game?.players.find((player) => player.userId !== user.id);
  const playing = game?.status === "PLAYING";
  const myTurn = playing && game?.turnUserId === user.id;
  const selectedPiece: PieceInstance | null = (myTurn && game?.tray.find((piece) => piece?.uid === selectedUid)) || null;

  // The server sends time left rather than a clock, so the countdown ignores clock differences.
  useEffect(() => {
    if (!game || game.status !== "PLAYING") return;
    const endsAt = performance.now() + game.turnRemainingMs;
    const tick = () => setRemainingMs(Math.max(0, endsAt - performance.now()));
    tick();
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [game]);

  const placement = useMemo(() => {
    if (!me || !selectedPiece || !hoverCell) return null;
    if (canPlace(me.board, selectedPiece, hoverCell.row, hoverCell.col)) return hoverCell;
    const closest = getClosestPlacement(me.board, selectedPiece, hoverCell);
    return getPlacementDistanceSquared(closest, hoverCell) <= MAX_SNAP_DISTANCE ** 2 ? closest : null;
  }, [hoverCell, me, selectedPiece]);

  const previewCells = useMemo(() => {
    if (!selectedPiece || !placement) return NO_CELLS;
    return new Set(selectedPiece.cells.map(([row, col]) => `${placement.row + row}-${placement.col + col}`));
  }, [placement, selectedPiece]);

  function clearingCellsFor(userId: string | undefined) {
    return game?.lastMove?.userId === userId && game?.lastMove ? new Set(game.lastMove.clearingCells) : NO_CELLS;
  }

  function placeAt(row: number, col: number) {
    if (!me || !selectedPiece) return;
    const target = placement ?? { row, col };
    if (!canPlace(me.board, selectedPiece, target.row, target.col)) return;
    match.place(selectedPiece.uid, target.row, target.col);
    setSelectedUid(null);
    setHoverCell(null);
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
      <main className="create-room-screen match-screen">
        <section className="match-waiting" aria-live="polite">
          <LoaderCircle aria-hidden="true" className="room-spinner" size={32} />
          <h1>{match.connected ? "상대를 기다리는 중…" : "서버에 연결하는 중…"}</h1>
          <p><Users aria-hidden="true" size={18} /> 접속 {match.connectedUserIds.length}/2명 · 두 명이 모두 접속하면 바로 시작해요.</p>
          <MatchRoomResult room={room} title="대기실에 입장했어요." />
          <button className="secondary-action" onClick={onExit} type="button">나가기</button>
        </section>
      </main>
    );
  }

  const secondsLeft = (remainingMs / 1000).toFixed(1);
  const won = game.winnerUserId === user.id;

  return (
    <main className="match-screen">
      <div className="match-boards">
        <section aria-label="내 보드" className="match-board">
          <PlayerHeading active={Boolean(myTurn)} label="나" player={me} secondsLeft={secondsLeft} />
          <Board
            board={me.board}
            boardRef={myBoardRef}
            clearingCells={clearingCellsFor(me.userId)}
            hoverCell={hoverCell}
            onCellClick={placeAt}
            onCellEnter={setHoverCell}
            onCellLeave={() => setHoverCell(null)}
            previewCells={previewCells}
            previewClearingCells={NO_CELLS}
            selectedPiece={selectedPiece}
          />
        </section>
        <section aria-label="상대 보드" className="match-board match-board-rival">
          <PlayerHeading active={playing && !myTurn} label="상대" player={rival} secondsLeft={secondsLeft} />
          <Board
            board={rival.board}
            boardRef={rivalBoardRef}
            clearingCells={clearingCellsFor(rival.userId)}
            hoverCell={null}
            onCellClick={() => undefined}
            onCellEnter={() => undefined}
            onCellLeave={() => undefined}
            previewCells={NO_CELLS}
            previewClearingCells={NO_CELLS}
            selectedPiece={null}
          />
        </section>
      </div>

      <section aria-label="공용 블록" className="match-tray-panel">
        <p aria-live="polite" className="match-turn">
          {!playing ? "게임 종료" : myTurn ? (selectedPiece ? "내 보드에서 놓을 칸을 누르세요." : "내 차례예요. 블록을 고르세요.") : `${rival.nickname}님의 차례예요.`}
          {!match.connected && playing && " · 재연결 중…"}
        </p>
        {match.message && <p className="match-error" role="alert">{match.message}</p>}
        <div className="match-tray">
          {game.tray.map((piece, index) => piece
            ? (
              <button
                aria-label={`${index + 1}번 블록${piece.special ? ` (${piece.special})` : ""}`}
                aria-pressed={selectedPiece?.uid === piece.uid}
                className={`match-tray-slot${selectedPiece?.uid === piece.uid ? " is-selected" : ""}`}
                disabled={!myTurn}
                key={piece.uid}
                onClick={() => setSelectedUid(selectedPiece?.uid === piece.uid ? null : piece.uid)}
                type="button"
              >
                <PieceShape cellGap={2} cellSize={14} piece={piece} />
              </button>
            )
            : <span aria-hidden="true" className="match-tray-slot is-empty" key={`empty-${index}`} />)}
        </div>
        {playing && <button className="secondary-action match-forfeit" onClick={match.forfeit} type="button"><Flag aria-hidden="true" size={18} />기권</button>}
      </section>

      {!playing && (
        <div className="match-result" role="dialog" aria-modal="true" aria-labelledby="match-result-title">
          <div className="match-result-card">
            <Trophy aria-hidden="true" size={36} />
            <h1 id="match-result-title">{won ? "승리!" : "패배"}</h1>
            <p>{game.finishReason ? FINISH_REASON_LABELS[game.finishReason] : ""}</p>
            <p>{me.nickname} {me.score.toLocaleString()}점 : {rival.score.toLocaleString()}점 {rival.nickname}</p>
            <button className="primary-action" onClick={onExit} type="button">방 목록으로</button>
          </div>
        </div>
      )}
    </main>
  );
}

export default MatchGameScreen;
