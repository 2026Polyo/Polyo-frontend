import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameSession } from "../hooks/useGameSession";
import {
  clearActiveRoom,
  loadActiveRoom,
  saveActiveRoom,
} from "../features/activeRoomStorage";
import { matchRoomApi } from "../features/matchroomApi";
import type { MatchRoomDetails } from "../features/matchroom";
import { ThemeScope } from "../components/ThemeScope";
import { getGameTheme, type GameThemeId } from "../features/themes/gameThemes";
import { useShopAccount } from "../hooks/shop";
import { AppRouter } from "../router";
import { clearAuth, type AuthUser } from "../api";

const PRACTICE_DISCOVERY_KEY = "polyo.practice.discovered";
const HomeRouter = lazy(() => import("../router/HomeRouter"));
const MatchGameScreen = lazy(() => import("../screens/MatchGameScreen"));

interface AppShellProps {
  user: AuthUser;
  onUserChange: (user: AuthUser) => void;
}

export default function AppShell({ user, onUserChange }: AppShellProps) {
  const navigate = useNavigate();
  const [practice, setPractice] = useState<{ firstVisit: boolean } | null>(
    null,
  );
  const discoveredPractice = useRef(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [devPreviewThemeId, setDevPreviewThemeId] =
    useState<GameThemeId | null>(null);
  const shopAccount = useShopAccount(user.id);
  const equippedThemeId = getGameTheme(shopAccount.account?.equippedThemeId).id;
  const activeThemeId = devPreviewThemeId ?? equippedThemeId;
  const { gamePhase, playScreenProps, startScreenProps } = useGameSession(
    true,
    activeThemeId,
  );
  const [multiplayerView, setMultiplayerView] = useState<
    "home" | "lobby" | "create"
  >("home");
  // Restored after a refresh, so a running match picks up where it was instead of being abandoned.
  const [activeRoom, setActiveRoom] = useState<MatchRoomDetails | null>(() =>
    loadActiveRoom(user.id),
  );
  const restoreRoomFocus = useRef<string | null>(null);

  useEffect(() => {
    if (gamePhase === "start") setDevPreviewThemeId(null);
  }, [gamePhase]);

  useEffect(() => {
    if (restoreRoomFocus.current) {
      document.getElementById(restoreRoomFocus.current)?.focus();
      restoreRoomFocus.current = null;
    }
  }, [multiplayerView, practice]);

  function enterRoom(room: MatchRoomDetails) {
    saveActiveRoom(user.id, room);
    setActiveRoom(room);
  }

  if (activeRoom) {
    return (
      <Suspense fallback={null}>
        <ThemeScope themeId={equippedThemeId}>
          <MatchGameScreen
            onExit={() => {
              clearActiveRoom();
              setActiveRoom(null);
              setMultiplayerView("lobby");
            }}
            room={activeRoom}
            user={user}
          />
        </ThemeScope>
      </Suspense>
    );
  }

  function openPractice() {
    let firstVisit = !discoveredPractice.current;
    try {
      firstVisit &&= localStorage.getItem(PRACTICE_DISCOVERY_KEY) !== "true";
      if (firstVisit) localStorage.setItem(PRACTICE_DISCOVERY_KEY, "true");
    } catch {
      // The current session still remembers the discovery if browser storage is unavailable.
    }
    discoveredPractice.current = true;
    setPractice({ firstVisit });
  }

  const homeRoute = (
    <HomeRouter
      gamePhase={gamePhase}
      playScreenProps={playScreenProps}
      startScreenProps={startScreenProps}
      activeThemeId={activeThemeId}
      practice={practice}
      multiplayerView={multiplayerView}
      profileOpen={profileOpen}
      user={user}
      restoreRoomFocus={restoreRoomFocus}
      matchRoomApi={matchRoomApi}
      onEnterRoom={enterRoom}
      onSetPractice={setPractice}
      onSetMultiplayerView={setMultiplayerView}
      onSetProfileOpen={setProfileOpen}
      onUserChange={onUserChange}
      onOpenRanking={() => navigate("/ranking")}
      onOpenShop={() => {
        void shopAccount.refresh();
        navigate("/shop");
      }}
      onOpenPractice={openPractice}
      onLogout={() => {
        clearActiveRoom();
        // Clears the stored login and fires AUTH_EXPIRED_EVENT, whose handler signs the user out.
        clearAuth();
      }}
    />
  );

  return (
    <AppRouter
      ranking={{
        currentUserId: user.id,
        themeId: activeThemeId,
        user,
        onUserChange,
      }}
      shop={{
        themeId: equippedThemeId,
        wallet: shopAccount,
        onGoHome: () => navigate("/"),
        onDevPreview: import.meta.env.DEV
          ? (themeId) => {
              setDevPreviewThemeId(themeId);
              navigate("/");
            }
          : undefined,
      }}
      home={homeRoute}
    />
  );
}
