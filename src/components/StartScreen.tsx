import { Layers, LogOut, Play, Trophy } from "lucide-react";
import StartDeckModal from "./StartDeckModal";
import type { GameMode, PieceTemplate } from "../types";

const START_PREVIEW_CELLS: string[] = [
  "piece-cyan", "piece-lime", "piece-amber", "", "",
  "piece-rose", "piece-violet", "piece-blue", "piece-teal", "piece-orange", "", "",
  "piece-pink", "piece-green", "piece-indigo", ""
];

interface StartScreenProps {
  startFlow: "mode" | "continue" | null;
  onModeSelect: (mode: GameMode) => void;
  onCloseStartFlow: () => void;
  onStartFresh: () => void;
  availableBaseIds: string[];
  baseLoadout: string[];
  best: number;
  canStartNewGame: boolean;
  loadoutIds: string[];
  maxBase: number;
  maxSpecial: number;
  startDeckOpen: boolean;
  stash: PieceTemplate[];
  onAddBase: (id: string) => void;
  onAddSpecial: (id: string) => void;
  onCloseDeck: () => void;
  onContinue: () => void;
  onNewGame: () => void;
  onOpenDeck: () => void;
  onLogout: () => void;
  onRemoveBase: (id: string) => void;
  onRemoveSpecial: (id: string) => void;
  onRandomizeDeck: () => void;
}

function StartScreen({
  startFlow,
  onModeSelect,
  onCloseStartFlow,
  onStartFresh,
  availableBaseIds,
  baseLoadout,
  best,
  loadoutIds,
  maxBase,
  maxSpecial,
  startDeckOpen,
  stash,
  onAddBase,
  onAddSpecial,
  onCloseDeck,
  onContinue,
  onNewGame,
  onOpenDeck,
  onLogout,
  onRemoveBase,
  onRemoveSpecial,
  onRandomizeDeck
}: StartScreenProps) {
  return (
    <main className="app-shell start-shell">
      <section className="start-screen" aria-labelledby="start-title">
        <button className="start-logout-action" onClick={onLogout} type="button">
          <LogOut size={17} aria-hidden="true" />
          로그아웃
        </button>
        <div className="start-preview" aria-hidden="true">
          {START_PREVIEW_CELLS.map((cellClass, index) => (
            <span className={`start-cell ${cellClass}`} key={index} />
          ))}
        </div>
        <h1 id="start-title">Polyomino</h1>
        <div className="start-actions">
          <button aria-label="새 게임" className="primary-action" onClick={onNewGame} type="button">
            <Play size={20} aria-hidden="true" />
            새 게임
          </button>
          <button className="start-deck-action" onClick={onOpenDeck} type="button">
            <Layers size={20} aria-hidden="true" />
            덱 구성
          </button>
        </div>
        <div className="start-best" aria-label="Best score">
          <Trophy size={20} aria-hidden="true" />
          <span>Best</span>
          <strong>{best}</strong>
        </div>
      </section>
      {startFlow && (
        <div className="start-dialog-backdrop">
          <section className="start-dialog" role="dialog" aria-modal="true" aria-labelledby="start-dialog-title">
            <h2 id="start-dialog-title">{startFlow === "mode" ? "모드 선택" : "이전 게임을 이어가시겠습니까?"}</h2>
            <div className="start-dialog-actions">
              {startFlow === "mode" ? (
                <>
                  <button className="primary-action" type="button" autoFocus onClick={() => onModeSelect("normal")}>일반모드</button>
                  <button className="secondary-action" type="button" onClick={() => onModeSelect("hard")}>하드모드</button>
                </>
              ) : (
                <>
                  <button className="primary-action" type="button" autoFocus onClick={onContinue}>예</button>
                  <button className="secondary-action" type="button" onClick={onStartFresh}>아니요</button>
                </>
              )}
              <button className="start-dialog-cancel" type="button" onClick={onCloseStartFlow}>취소</button>
            </div>
          </section>
        </div>
      )}
      {startDeckOpen && (
        <StartDeckModal
          stash={stash}
          loadoutIds={loadoutIds}
          baseLoadout={baseLoadout}
          availableBaseIds={availableBaseIds}
          maxBase={maxBase}
          maxSpecial={maxSpecial}
          onAddBase={onAddBase}
          onRemoveBase={onRemoveBase}
          onAddSpecial={onAddSpecial}
          onRemoveSpecial={onRemoveSpecial}
          onRandomize={onRandomizeDeck}
          onClose={onCloseDeck}
        />
      )}
    </main>
  );
}

export default StartScreen;
