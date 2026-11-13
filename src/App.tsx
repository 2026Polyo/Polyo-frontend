import { useEffect, useEffectEvent, useRef, useState } from "react";
import "./styles/App.css";
import "./styles/AuthScreen.css";
import "./styles/StartScreen.css";
import "./styles/RankingScreen.css";
import "./styles/AutoUndoFlash.css";
import AuthScreen from "./components/AuthScreen";
import StartScreen from "./components/StartScreen";
import RankingScreen from "./components/RankingScreen";
import { useGameSession } from "./hooks/useGameSession";
import PlayScreen from "./screens/PlayScreen";
import CreateRoomScreen from "./screens/CreateRoomScreen";
import { clearActiveRoom, loadActiveRoom, saveActiveRoom } from "./features/activeRoomStorage";
import { matchRoomApi } from "./features/matchroomApi";
import type { MatchRoomDetails } from "./features/matchroom";
import MatchGameScreen from "./screens/MatchGameScreen";
import MultiplayerScreen from "./screens/MultiplayerScreen";
import { AUTH_EXPIRED_EVENT, AUTH_TOKEN_KEY, AUTH_USER_KEY, AuthRequestError, clearAuth, getCurrentUser, type AuthUser } from "./api/auth";
import ShopScreen from "./screens/ShopScreen";
import { ThemeScope } from "./components/ThemeScope";
import { getGameTheme, type GameThemeId } from "./features/themes/gameThemes";
import { useShopAccount } from "./hooks/useShopAccount";

function App() {
  const [shopOpen, setShopOpen] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authCheckError, setAuthCheckError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [devPreviewThemeId, setDevPreviewThemeId] = useState<GameThemeId | null>(null);
  const shopAccount = useShopAccount(user?.id);
  const grantLocalCoins = useEffectEvent(() => { void shopAccount.grantLocalCoins(); });
  const equippedThemeId = getGameTheme(shopAccount.account?.equippedThemeId).id;
  const { gamePhase, playScreenProps, startScreenProps } =
    useGameSession(Boolean(user), devPreviewThemeId ?? equippedThemeId);
  const [multiplayerView, setMultiplayerView] =
    useState<"home" | "lobby" | "create">("home");
  // Restored after a refresh, so a running match picks up where it was instead of being abandoned.
  const [activeRoom, setActiveRoom] =
    useState<MatchRoomDetails | null>(() => (user ? loadActiveRoom(user.id) : null));
  const restoreRoomFocus = useRef<string | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV || !user) return;
    let backquoteHeld = false;
    function reset() { backquoteHeld = false; }
    function release(event: KeyboardEvent) {
      if (event.code === "Backquote" || !event.ctrlKey) reset();
    }
    function press(event: KeyboardEvent) {
      if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.repeat || event.isComposing) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable]")) return;
      if (event.code === "Backquote") {
        backquoteHeld = true;
      } else if (event.code === "BracketRight" && backquoteHeld) {
        event.preventDefault();
        grantLocalCoins();
      }
    }
    window.addEventListener("keydown", press);
    window.addEventListener("keyup", release);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", press);
      window.removeEventListener("keyup", release);
      window.removeEventListener("blur", reset);
    };
  }, [user]);

  useEffect(() => {
    if (gamePhase === "start" || !user) setDevPreviewThemeId(null);
  }, [gamePhase, user]);

  useEffect(() => {
    if (restoreRoomFocus.current) {
      document.getElementById(restoreRoomFocus.current)?.focus();
      restoreRoomFocus.current = null;
    }
  }, [multiplayerView]);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setAuthChecking(false);
      return;
    }

    void getCurrentUser()
      .then((currentUser) => {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser));
        setUser(currentUser);
      })
      .catch((error: unknown) => {
        if (error instanceof AuthRequestError && error.status === 401) {
          clearAuth();
          return;
        }
        setAuthCheckError("로그인 상태를 확인할 수 없습니다. 서버 연결을 확인한 뒤 다시 시도해주세요.");
      })
      .finally(() => setAuthChecking(false));

    function handleAuthExpired() {
      setUser(null);
      setShopOpen(false);
      setRankingOpen(false);
    }

    function handleStorage(event: StorageEvent) {
      if ((event.key === AUTH_TOKEN_KEY || event.key === AUTH_USER_KEY) &&
          !localStorage.getItem(AUTH_TOKEN_KEY)) {
        handleAuthExpired();
      }
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  if (authChecking) return null;
  if (authCheckError) {
    return (
      <main className="app-shell auth-shell">
        <section className="auth-card" role="alert">
          <h1>로그인 상태 확인 실패</h1>
          <p>{authCheckError}</p>
          <button className="auth-submit" type="button" onClick={() => window.location.reload()}>
            다시 시도
          </button>
        </section>
      </main>
    );
  }
  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  const currentUser = user;
  function enterRoom(room: MatchRoomDetails) {
    saveActiveRoom(currentUser.id, room);
    setActiveRoom(room);
  }

  if (activeRoom) {
    return (
      <ThemeScope themeId={equippedThemeId}>
        <MatchGameScreen onExit={() => {
          clearActiveRoom();
          setActiveRoom(null);
          setMultiplayerView("lobby");
        }} room={activeRoom} user={user} />
      </ThemeScope>
    );
  }

  if (shopOpen)
    return (
      <ShopScreen
        wallet={shopAccount}
        onGoHome={() => setShopOpen(false)}
        onDevPreview={import.meta.env.DEV ? (themeId) => {
          setDevPreviewThemeId(themeId);
          setShopOpen(false);
        } : undefined}
      />
    );

  if (gamePhase === "start") {
    if (multiplayerView === "create") {
      return (
        <CreateRoomScreen
          onClose={() => {
            restoreRoomFocus.current = "lobby-create-room";
            setMultiplayerView("lobby");
          }}
          onCreateRoom={matchRoomApi.create}
          onEnterRoom={enterRoom}
        />
      );
    }
    if (multiplayerView === "lobby") {
      return (
        <MultiplayerScreen
          api={matchRoomApi}
          onBack={() => {
            restoreRoomFocus.current = "start-multiplayer";
            setMultiplayerView("home");
          }}
          onCreateRoom={() => setMultiplayerView("create")}
          onEnterRoom={enterRoom}
        />
      );
    }
    if (rankingOpen) {
      return (
        <ThemeScope themeId={equippedThemeId}>
          <RankingScreen
            currentUserId={user.id}
            onBack={() => setRankingOpen(false)}
          />
        </ThemeScope>
      );
    }

    return (
      <ThemeScope themeId={equippedThemeId}>
        <StartScreen
          {...startScreenProps}
          themeId={equippedThemeId}
          onMultiplayer={() => setMultiplayerView("lobby")}
          onOpenRanking={() => setRankingOpen(true)}
          onOpenShop={() => {
            void shopAccount.refresh();
            setShopOpen(true);
          }}
          onLogout={() => {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_USER_KEY);
            clearActiveRoom();
            setUser(null);
          }}
        />
      </ThemeScope>
    );
  }

  return <PlayScreen {...playScreenProps} />;
}

export default App;
