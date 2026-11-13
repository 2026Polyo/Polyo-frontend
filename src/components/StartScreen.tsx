import StartDeckModal from "./StartDeckModal";
import { Copy, LogOut, ShoppingCart, Trophy } from "lucide-react";
import type { GameMode, PieceTemplate } from "../types";
import type { HardGameRequest } from "../hooks/useHardGameRequest";
import type { GameThemeId } from "../features/themes/gameThemes";
import { getGameTheme } from "../features/themes/gameThemes";

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
      <section
        className="start-screen"
        aria-labelledby="start-title"
        data-game-theme={themeId}
      >
        <div className="start-decoration" aria-hidden="true">
          {["yellow", "purple", "green", "pink", "cyan"].map((color) => (
            <span className={`start-piece start-piece-${color}`} key={color}>
              <i />
              <i />
              <i />
              <i />
            </span>
          ))}
          {[
            ["left-top", "green"],
            ["left-middle", "purple"],
            ["left-bottom", "cyan"],
            ["right-top", "cyan"],
            ["right-middle", "yellow"],
            ["right-bottom", "pink"],
          ].map(([position, color]) => (
            <span
              className={`start-piece start-piece-${color} start-side-piece start-side-${position}`}
              key={position}
            >
              <i />
              <i />
              <i />
              <i />
            </span>
          ))}
        </div>
        <h1 id="start-title">Polyo</h1>
        <button
          aria-label="로그아웃"
          className="start-control start-logout"
          onClick={onLogout}
          type="button"
        >
          <LogOut aria-hidden="true" />
        </button>
        <label className="start-theme">
          <span>테마 미리보기</span>
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
        <section className="start-games" aria-labelledby="start-games-title">
          <h2 id="start-games-title">게임 시작</h2>
          <button
            className="start-control start-new"
            onClick={onNewGame}
            type="button"
          >
            새 게임
          </button>
          <button
            className="start-control start-multi"
            id="start-multiplayer"
            onClick={onMultiplayer}
            type="button"
          >
            멀티플레이
          </button>
        </section>
        <nav className="start-utilities" aria-label="부가 메뉴">
          <button className="start-control" onClick={onOpenDeck} type="button">
            <Copy aria-hidden="true" />덱 구성
          </button>
          <button
            className="start-control"
            onClick={onOpenRanking}
            type="button"
          >
            <Trophy aria-hidden="true" />
            랭킹
          </button>
          <button className="start-control" onClick={onOpenShop} type="button">
            <ShoppingCart aria-hidden="true" />
            상점
          </button>
        </nav>
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
            {hardRequest?.pending && (
              <p role="status">하드모드를 시작하는 중입니다.</p>
            )}
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
