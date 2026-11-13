import { useEffect, useRef, useState } from "react";
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
import { AUTH_EXPIRED_EVENT, AUTH_TOKEN_KEY, AUTH_USER_KEY, type AuthUser } from "./api/auth";
import ShopScreen from "./screens/ShopScreen";
import { ThemeScope } from "./components/ThemeScope";
import { getGameTheme, type GameThemeId } from "./features/themes/gameThemes";
import { useShopAccount } from "./hooks/useShopAccount";

function App() {
  const [shopOpen, setShopOpen] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [previewThemeId, setPreviewThemeId] = useState<GameThemeId | null>(null);
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    if (!token || !storedUser) return null;
    try { return JSON.parse(storedUser) as AuthUser; } catch { return null; }
  });
  const shopAccount = useShopAccount(user?.id);
  const equippedThemeId = getGameTheme(shopAccount.account?.equippedThemeId).id;
  const { gamePhase, playScreenProps, startScreenProps } =
    useGameSession(Boolean(user), previewThemeId ?? equippedThemeId);
  const [multiplayerView, setMultiplayerView] = useState<"home" | "lobby" | "create">("home");
  // Restored after a refresh, so a running match picks up where it was instead of being abandoned.
  const [activeRoom, setActiveRoom] = useState<MatchRoomDetails | null>(() => (user ? loadActiveRoom(user.id) : null));
  const restoreRoomFocus = useRef<string | null>(null);

  useEffect(() => {
    if (gamePhase === "start") setPreviewThemeId(null);
  }, [gamePhase]);

  useEffect(() => {
    if (restoreRoomFocus.current) {
      document.getElementById(restoreRoomFocus.current)?.focus();
      restoreRoomFocus.current = null;
    }
  }, [multiplayerView]);

  useEffect(() => {
    function handleAuthExpired() {
      setUser(null);
      setShopOpen(false);
      setRankingOpen(false);
      setPreviewThemeId(null);
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

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
        onEquipTheme={async (id) => {
          if (await shopAccount.equip(id)) setPreviewThemeId(null);
        }}
        onSelectPreviewTheme={(id) => {
          setPreviewThemeId(id);
          setShopOpen(false);
        }}
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
      return <MultiplayerScreen api={matchRoomApi} onBack={() => {
        restoreRoomFocus.current = "start-multiplayer";
        setMultiplayerView("home");
      }} onCreateRoom={() => setMultiplayerView("create")} onEnterRoom={enterRoom} />;
    }
    if (rankingOpen) {
      return (
        <ThemeScope themeId={equippedThemeId}>
          <RankingScreen currentUserId={user.id} onBack={() => setRankingOpen(false)} />
        </ThemeScope>
      );
    }

    return (
      <ThemeScope themeId={equippedThemeId}>
        <StartScreen
          {...startScreenProps}
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
            setPreviewThemeId(null);
            setUser(null);
          }}
        />
      </ThemeScope>
    );
  }

  return <PlayScreen {...playScreenProps} />;
}

export default App;
