import { Layers, Play, Trophy } from "lucide-react";
import StartDeckModal from "./StartDeckModal";
import type { PieceTemplate } from "../types";

const START_PREVIEW_CELLS: string[] = [
  "piece-cyan", "piece-lime", "piece-amber", "", "",
  "piece-rose", "piece-violet", "piece-blue", "piece-teal", "piece-orange", "", "",
  "piece-pink", "piece-green", "piece-indigo", ""
];

interface StartScreenProps {
  availableBaseIds: string[];
  baseLoadout: string[];
  best: number;
  canContinue: boolean;
  canStartNewGame: boolean;
  loadoutIds: string[];
  maxBase: number;
  maxSpecial: number;
  score: number;
  startDeckOpen: boolean;
  stash: PieceTemplate[];
  onAddBase: (id: string) => void;
  onAddSpecial: (id: string) => void;
  onCloseDeck: () => void;
  onContinue: () => void;
  onNewGame: () => void;
  onOpenDeck: () => void;
  onRemoveBase: (id: string) => void;
  onRemoveSpecial: (id: string) => void;
}

function StartScreen({
  availableBaseIds,
  baseLoadout,
  best,
  canContinue,
  canStartNewGame,
  loadoutIds,
  maxBase,
  maxSpecial,
  score,
  startDeckOpen,
  stash,
  onAddBase,
  onAddSpecial,
  onCloseDeck,
  onContinue,
  onNewGame,
  onOpenDeck,
  onRemoveBase,
  onRemoveSpecial
}: StartScreenProps) {
  return (
    <main className="app-shell start-shell">
      <section className="start-screen" aria-labelledby="start-title">
        <div className="start-preview" aria-hidden="true">
          {START_PREVIEW_CELLS.map((cellClass, index) => (
            <span className={`start-cell ${cellClass}`} key={index} />
          ))}
        </div>
        <h1 id="start-title">Polyomino</h1>
        <div className="start-actions">
          {canContinue && (
            <button className="primary-action" onClick={onContinue} type="button">
              <Play size={20} aria-hidden="true" />
              이어하기
            </button>
          )}
          <button
            aria-label={canStartNewGame ? "새 게임" : "일반 블록 10개를 선택해야 새 게임을 시작할 수 있습니다."}
            aria-describedby={!canStartNewGame ? "new-game-disabled-reason" : undefined}
            className={canContinue ? "secondary-action" : "primary-action"}
            disabled={!canStartNewGame}
            onClick={onNewGame}
            title={canStartNewGame ? undefined : "일반 블록 10개를 선택해야 시작할 수 있습니다."}
            type="button"
          >
            {!canContinue && <Play size={20} aria-hidden="true" />}
            새 게임
          </button>
          {!canStartNewGame && (
            <p className="start-disabled-hint" id="new-game-disabled-reason">
              일반 블록 {maxBase}개를 선택해야 시작할 수 있습니다.
            </p>
          )}
          <button className="start-deck-action" onClick={onOpenDeck} type="button">
            <Layers size={20} aria-hidden="true" />
            덱 구성
          </button>
        </div>
        {canContinue && (
          <div className="start-saved-score" aria-label="Saved game score">
            <span>진행 점수</span>
            <strong>{score}</strong>
          </div>
        )}
        <div className="start-best" aria-label="Best score">
          <Trophy size={20} aria-hidden="true" />
          <span>Best</span>
          <strong>{best}</strong>
        </div>
      </section>
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
          onClose={onCloseDeck}
        />
      )}
    </main>
  );
}

export default StartScreen;
