import { useRef, useState } from "react";
import StartDeckModal from "./StartDeckModal";
import MenuBlock from "./MenuBlock";
import {
  Copy,
  LogOut,
  ShoppingCart,
  Trophy,
  UserRound,
} from "lucide-react";
import type { GameMode, PieceTemplate } from "../types";
import type { HardGameRequest } from "../hooks/useHardGameRequest";
import type { GameThemeId } from "../features/themes/gameThemes";
import { useReducedMotion } from "../hooks/useReducedMotion";

type LogoMotion = { angle: number; velocity: number };
const LOGO_AT_REST: LogoMotion = { angle: 0, velocity: 0 };
const SWING_DURATION = 1200;
const DROP_DURATION = 690;

function swingAt({ angle, velocity }: LogoMotion, seconds: number): LogoMotion {
  const damping = 5.5;
  const frequency = 13;
  const decay = Math.exp(-damping * seconds);
  const sine = Math.sin(frequency * seconds);
  const cosine = Math.cos(frequency * seconds);
  const sineWeight = (velocity + damping * angle) / frequency;
  const oscillation = angle * cosine + sineWeight * sine;
  return {
    angle: decay * oscillation,
    velocity:
      decay *
      (frequency * (sineWeight * cosine - angle * sine) -
        damping * oscillation),
  };
}

function motionFrames(
  duration: number,
  transformAt: (seconds: number) => string,
): Keyframe[] {
  const segments = Math.ceil(duration / 16.7);
  return Array.from({ length: segments + 1 }, (_, index) => {
    const offset = index / segments;
    return { offset, transform: transformAt((offset * duration) / 1000) };
  });
}

interface StartScreenProps {
  startFlow: "mode" | "continue" | null;
  hardRequest?: HardGameRequest;
  onModeSelect: (mode: GameMode) => void;
  onCloseStartFlow: () => void;
  onStartFresh: () => void;
  themeId: GameThemeId;
  onOpenShop: () => void;
  onOpenPractice: () => void;
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
  onOpenProfile: () => void;
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
  onOpenShop,
  onOpenPractice,
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
  onOpenProfile,
  onLogout,
  onRemoveBase,
  onRemoveSpecial,
  onRandomizeDeck,
}: StartScreenProps) {
  const logoClicks = useRef({ count: 0, firstAt: 0 });
  const logoAnimation = useRef<Animation | null>(null);
  const swingStart = useRef<LogoMotion>(LOGO_AT_REST);
  const [openingPractice, setOpeningPractice] = useState(false);
  const reducedMotion = useReducedMotion();

  function tapLogo(logo: HTMLButtonElement) {
    if (openingPractice) return;
    const now = performance.now();
    const previous = logoClicks.current;
    const withinWindow = previous.count > 0 && now - previous.firstAt <= 2500;
    const count = withinWindow ? previous.count + 1 : 1;
    logoClicks.current =
      count < 5
        ? { count, firstAt: withinWindow ? previous.firstAt : now }
        : { count: 0, firstAt: 0 };
    if (reducedMotion) {
      logoAnimation.current?.cancel();
      logoAnimation.current = null;
      swingStart.current = LOGO_AT_REST;
      if (count === 5) onOpenPractice();
      return;
    }

    const elapsed = Number(
      logoAnimation.current?.currentTime ?? SWING_DURATION,
    );
    const motion =
      elapsed < SWING_DURATION
        ? swingAt(swingStart.current, elapsed / 1000)
        : LOGO_AT_REST;
    logoAnimation.current?.cancel();
    if (count === 5) {
      const viewportHeight =
        window.visualViewport?.height ?? window.innerHeight;
      const gravity = (2 * viewportHeight) / (DROP_DURATION / 1000) ** 2;
      const angularVelocity = Math.max(-165, Math.min(165, motion.velocity));
      logoAnimation.current = logo.animate(
        motionFrames(
          DROP_DURATION,
          (time) =>
            `translateY(${0.5 * gravity * time ** 2}px) rotate(${motion.angle + angularVelocity * time}deg)`,
        ),
        { duration: DROP_DURATION, fill: "forwards" },
      );
      setOpeningPractice(true);
      return;
    }

    // Apply the click in the direction of motion so it adds energy to the swing.
    const direction = Math.sign(motion.velocity) || 1;
    const speed = Math.abs(motion.velocity);
    swingStart.current = {
      angle: motion.angle,
      velocity:
        direction * Math.max(speed, Math.min(245, speed + 60 + count * 28)),
    };
    const initial = swingStart.current;
    logoAnimation.current = logo.animate(
      motionFrames(
        SWING_DURATION,
        (time) => `rotate(${swingAt(initial, time).angle}deg)`,
      ),
      { duration: SWING_DURATION },
    );
  }

  return (
    <main
      className="app-shell start-shell menu-scene"
      data-game-theme={themeId}
    >
      <section
        className="start-screen"
        aria-labelledby="start-title"
        inert={openingPractice}
      >
        <div className="start-decoration" aria-hidden="true">
          {["yellow", "purple", "green", "pink", "cyan"].map((color) => (
            <MenuBlock color={color} key={color} />
          ))}
          {[
            ["left-top", "green"],
            ["left-middle", "purple"],
            ["left-bottom", "cyan"],
            ["right-top", "cyan"],
            ["right-middle", "yellow"],
            ["right-bottom", "pink"],
          ].map(([position, color]) => (
            <MenuBlock
              color={color}
              className={`start-side-piece start-side-${position}`}
              key={position}
            />
          ))}
        </div>
        <h1 id="start-title">
          <button
            id="start-logo-button"
            className="start-logo-button"
            type="button"
            onClick={(event) => tapLogo(event.currentTarget)}
            onKeyDown={(event) => {
              if (event.repeat) event.preventDefault();
            }}
          >
            Polyo
          </button>
        </h1>
        <button
          aria-label="로그아웃"
          className="start-control start-logout"
          onClick={onLogout}
          type="button"
        >
          <LogOut aria-hidden="true" />
        </button>
        <button
          aria-label="마이페이지"
          className="start-control start-profile"
          onClick={onOpenProfile}
          type="button"
        >
          <UserRound aria-hidden="true" />
          <span>마이페이지</span>
        </button>
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
      {openingPractice && (
        <div
          className="practice-transition practice-transition-out"
          aria-hidden="true"
          onAnimationEnd={onOpenPractice}
        />
      )}
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
                    className="secondary-action hard-mode-action"
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
