import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import "./styles/App.css";
import "./styles/AuthScreen.css";
import "./styles/MenuChrome.css";
import "./styles/StartScreen.css";
import "./styles/RankingScreen.css";
import "./styles/AutoUndoFlash.css";
import AuthScreen from "./components/AuthScreen";
import StartScreen from "./components/StartScreen";
import RankingScreen from "./components/RankingScreen";
import { useGameSession } from "./hooks/useGameSession";
import PlayScreen from "./screens/PlayScreen";
import CreateRoomScreen from "./screens/CreateRoomScreen";
import {
  clearActiveRoom,
  loadActiveRoom,
  saveActiveRoom,
} from "./features/activeRoomStorage";
import { matchRoomApi } from "./features/matchroomApi";
import type { MatchRoomDetails } from "./features/matchroom";
import MatchGameScreen from "./screens/MatchGameScreen";
import MultiplayerScreen from "./screens/MultiplayerScreen";
import {
  AUTH_EXPIRED_EVENT,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  AuthRequestError,
  clearAuth,
  getCurrentUser,
  type AuthUser,
} from "./api/auth";
import PracticeScreen from "./screens/PracticeScreen";
import { ThemeScope } from "./components/ThemeScope";
import { getGameTheme, type GameThemeId } from "./features/themes/gameThemes";
import { useShopAccount } from "./hooks/shop";
import ProfileModal from "./components/ProfileModal";
import { ShopRouter } from "./router";

const PRACTICE_DISCOVERY_KEY = "polyo.practice.discovered";

function AppContent() {
  const navigate = useNavigate();
  const [practice, setPractice] = useState<{ firstVisit: boolean } | null>(
    null,
  );
  const discoveredPractice = useRef(false);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [rankingProfileId, setRankingProfileId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authCheckError, setAuthCheckError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [devPreviewThemeId, setDevPreviewThemeId] =
    useState<GameThemeId | null>(null);
  const shopAccount = useShopAccount(user?.id);
  const equippedThemeId = getGameTheme(shopAccount.account?.equippedThemeId).id;
  const activeThemeId = devPreviewThemeId ?? equippedThemeId;
  const { gamePhase, playScreenProps, startScreenProps } = useGameSession(
    Boolean(user),
    activeThemeId,
  );
  const [multiplayerView, setMultiplayerView] = useState<
    "home" | "lobby" | "create"
  >("home");
  // Restored after a refresh, so a running match picks up where it was instead of being abandoned.
  const [activeRoom, setActiveRoom] = useState<MatchRoomDetails | null>(() =>
    user ? loadActiveRoom(user.id) : null,
  );
  const restoreRoomFocus = useRef<string | null>(null);

  useEffect(() => {
    if (gamePhase === "start" || !user) setDevPreviewThemeId(null);
  }, [gamePhase, user]);

  useEffect(() => {
    if (restoreRoomFocus.current) {
      document.getElementById(restoreRoomFocus.current)?.focus();
      restoreRoomFocus.current = null;
    }
  }, [multiplayerView, practice]);

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
        setAuthCheckError(
          "로그인 상태를 확인할 수 없습니다. 서버 연결을 확인한 뒤 다시 시도해주세요.",
        );
      })
      .finally(() => setAuthChecking(false));

    function handleAuthExpired() {
      setUser(null);
      navigate("/");
      setPractice(null);
      setRankingOpen(false);
    }

    function handleStorage(event: StorageEvent) {
      if (
        (event.key === AUTH_TOKEN_KEY || event.key === AUTH_USER_KEY) &&
        !localStorage.getItem(AUTH_TOKEN_KEY)
      ) {
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
          <button
            className="auth-submit"
            type="button"
            onClick={() => window.location.reload()}
          >
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
    );
  }

  const homeRoute =
    gamePhase !== "start" ? (
      <PlayScreen {...playScreenProps} />
    ) : practice ? (
      <PracticeScreen
        initialTheme={activeThemeId}
        firstVisit={practice.firstVisit}
        onClose={() => {
          restoreRoomFocus.current = "start-logo-button";
          setPractice(null);
        }}
      />
    ) : multiplayerView === "create" ? (
      <CreateRoomScreen
        onClose={() => {
          restoreRoomFocus.current = "lobby-create-room";
          setMultiplayerView("lobby");
        }}
        onCreateRoom={matchRoomApi.create}
        onEnterRoom={enterRoom}
      />
    ) : multiplayerView === "lobby" ? (
      <MultiplayerScreen
        api={matchRoomApi}
        onBack={() => {
          restoreRoomFocus.current = "start-multiplayer";
          setMultiplayerView("home");
        }}
        onCreateRoom={() => setMultiplayerView("create")}
        onEnterRoom={enterRoom}
      />
    ) : rankingOpen ? (
      <ThemeScope themeId={activeThemeId}>
        <RankingScreen
          currentUserId={user.id}
          themeId={activeThemeId}
          onBack={() => {
            setRankingOpen(false);
            setRankingProfileId(null);
          }}
          onSelectProfile={setRankingProfileId}
        />
        {rankingProfileId && (
          <ProfileModal
            user={{ id: rankingProfileId, loginId: "", nickname: "" }}
            profileUserId={rankingProfileId}
            readOnly={rankingProfileId !== user.id}
            onClose={() => setRankingProfileId(null)}
            onUserChange={rankingProfileId === user.id ? setUser : undefined}
          />
        )}
      </ThemeScope>
    ) : (
      <ThemeScope themeId={activeThemeId}>
        <StartScreen
          {...startScreenProps}
          themeId={activeThemeId}
          onMultiplayer={() => setMultiplayerView("lobby")}
          onOpenRanking={() => setRankingOpen(true)}
          onOpenProfile={() => setProfileOpen(true)}
          onOpenShop={() => {
            void shopAccount.refresh();
            navigate("/shop");
          }}
          onOpenPractice={() => {
            let firstVisit = !discoveredPractice.current;
            try {
              firstVisit &&=
                localStorage.getItem(PRACTICE_DISCOVERY_KEY) !== "true";
              if (firstVisit)
                localStorage.setItem(PRACTICE_DISCOVERY_KEY, "true");
            } catch {
              // The current session still remembers the discovery if browser storage is unavailable.
            }
            discoveredPractice.current = true;
            setPractice({ firstVisit });
          }}
          onLogout={() => {
            clearActiveRoom();
            // Clears the stored login and fires AUTH_EXPIRED_EVENT, whose handler signs the user out;
            // the dev theme preview is then reset by the effect that watches `user`.
            clearAuth();
          }}
        />
        {profileOpen && (
          <ProfileModal
            user={user}
            baseLoadout={startScreenProps.baseLoadout}
            loadoutIds={startScreenProps.loadoutIds}
            onClose={() => setProfileOpen(false)}
            onUserChange={setUser}
          />
        )}
      </ThemeScope>
    );

  return (
    <Routes>
      <Route
        path="/shop"
        element={
          <ShopRouter
            themeId={equippedThemeId}
            wallet={shopAccount}
            onGoHome={() => navigate("/")}
            onDevPreview={
              import.meta.env.DEV
                ? (themeId) => {
                    setDevPreviewThemeId(themeId);
                    navigate("/");
                  }
                : undefined
            }
          />
        }
      />
      <Route path="*" element={homeRoute} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
