import { Layers, LogOut, Play, Trophy, ShoppingBag, Users } from "lucide-react";
import StartDeckModal from "./StartDeckModal";
import StartMenuButton from "./StartMenuButton";
import type { GameMode, PieceTemplate } from "../types";
import type { HardGameRequest } from "../hooks/useHardGameRequest";
import type { GameThemeId } from "../features/themes/gameThemes";
import { getGameTheme } from "../features/themes/gameThemes";

const START_PREVIEW_CELLS: string[] = [
  "piece-cyan",
  "piece-lime",
  "piece-amber",
  "",
  "",
  "piece-rose",
  "piece-violet",
  "piece-blue",
  "piece-teal",
  "piece-orange",
  "",
  "",
  "piece-pink",
  "piece-green",
  "piece-indigo",
  "",
];

interface StartScreenProps {
  startFlow: "mode" | "continue" | null;
  hardRequest?: HardGameRequest;
  onModeSelect: (mode: GameMode) => void;
  onCloseStartFlow: () => void;
  onStartFresh: () => void;
  themeId: GameThemeId;
  onThemeChange: (themeId: GameThemeId) => void;
  onOpenShop: () => void;
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
  onMultiplayer: () => void;
  onNewGame: () => void;
  onOpenDeck: () => void;
  onOpenRanking: () => void;
  onLogout: () => void;
  onRemoveBase: (id: string) => void;
  onRemoveSpecial: (id: string) => void;
  onRandomizeDeck: () => void;
}

function StartScreen({
  startFlow,
  hardRequest,
  onModeSelect,
  onCloseStartFlow,
  onStartFresh,
  themeId,
  onThemeChange,
  onOpenShop,
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
  onMultiplayer,
  onNewGame,
  onOpenDeck,
  onOpenRanking,
  onLogout,
  onRemoveBase,
  onRemoveSpecial,
  onRandomizeDeck,
}: StartScreenProps) {
  return (
    <main className="app-shell start-shell">
      <section className="start-screen" aria-labelledby="start-title">
        <button
          className="start-logout-action"
          onClick={onLogout}
          type="button"
        >
          <LogOut size={17} aria-hidden="true" />
          로그아웃
        </button>
        <div className="start-preview" aria-hidden="true">
          {START_PREVIEW_CELLS.map((cellClass, index) => (
            <span className={`start-cell ${cellClass}`} key={index} />
          ))}
        </div>
        <h1 id="start-title">Polyo</h1>
        <label className="theme-preview-select">
          테마 미리보기
          <select
            value={themeId}
            onChange={(event) =>
              onThemeChange(getGameTheme(event.target.value).id)
            }
          >
            <option value="theme_classic">기본</option>
            <option value="theme_neon">네온 나이트</option>
            <option value="theme_jelly">젤리 팝</option>
            <option value="theme_minecraft">마인크래프트</option>
            <option value="theme_cat">고양이 드림</option>
          </select>
        </label>
        <div className="start-actions">
          <StartMenuButton
            id="start-multiplayer"
            icon={<Users aria-hidden="true" />}
            onClick={onMultiplayer}
          >
            멀티
          </StartMenuButton>
          <StartMenuButton
            icon={<Layers aria-hidden="true" />}
            onClick={onOpenDeck}
          >
            덱 구성
          </StartMenuButton>
          <StartMenuButton
            icon={<Trophy aria-hidden="true" />}
            onClick={onOpenRanking}
          >
            랭킹
          </StartMenuButton>
          <StartMenuButton
            icon={<ShoppingBag aria-hidden="true" />}
            onClick={onOpenShop}
          >
            상점
          </StartMenuButton>
          <button
            aria-label="새 게임"
            className="primary-action"
            onClick={onNewGame}
            type="button"
          >
            <Play size={20} aria-hidden="true" />새 게임
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
          <section
            className="start-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-dialog-title"
          >
            <h2 id="start-dialog-title">
              {startFlow === "mode"
                ? "모드 선택"
                : "이전 게임을 이어가시겠습니까?"}
            </h2>
            <div className="start-dialog-actions">
              {startFlow === "mode" ? (
                <>
                  <button
                    className="primary-action"
                    type="button"
                    autoFocus
                    onClick={() => onModeSelect("normal")}
                  >
                    일반모드
                  </button>
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => onModeSelect("hard")}
                  >
                    하드모드
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="primary-action"
                    type="button"
                    autoFocus
                    onClick={onContinue}
                  >
                    예
                  </button>
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={onStartFresh}
                  >
                    아니요
                  </button>
                </>
              )}
              <button
                className="start-dialog-cancel"
                type="button"
                onClick={onCloseStartFlow}
              >
                취소
              </button>
            </div>
            {hardRequest?.pending && <p role="status">하드모드를 시작하는 중입니다.</p>}
            {hardRequest?.error && <p role="alert">{hardRequest.error}</p>}
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
