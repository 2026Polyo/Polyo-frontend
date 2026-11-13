import { useEffect, useState } from "react";
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
import { AUTH_EXPIRED_EVENT, AUTH_TOKEN_KEY, AUTH_USER_KEY, clearAuth, getCurrentUser, type AuthUser } from "./api/auth";
import ShopScreen from "./screens/ShopScreen";
import { useThemePreview } from "./hooks/useThemePreview";
import { ThemeScope } from "./components/ThemeScope";

function App() {
  const [shopOpen, setShopOpen] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const { themeId, selectTheme } = useThemePreview();
  const { gamePhase, playScreenProps, startScreenProps } =
    useGameSession(Boolean(user), themeId);

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
      .catch(() => clearAuth())
      .finally(() => setAuthChecking(false));

    function handleAuthExpired() {
      setUser(null);
      setShopOpen(false);
      setRankingOpen(false);
    }

    function handleStorage(event: StorageEvent) {
      if ((event.key === AUTH_TOKEN_KEY || event.key === AUTH_USER_KEY) && !localStorage.getItem(AUTH_TOKEN_KEY)) {
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
  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  if (shopOpen)
    return (
      <ShopScreen
        onGoHome={() => setShopOpen(false)}
        onSelectPreviewTheme={(id) => {
          selectTheme(id);
          setShopOpen(false);
        }}
      />
    );

  if (gamePhase === "start") {
    if (rankingOpen) {
      return (
        <ThemeScope themeId={themeId}>
          <RankingScreen currentUserId={user.id} onBack={() => setRankingOpen(false)} />
        </ThemeScope>
      );
    }

    return (
      <ThemeScope themeId={themeId}>
        <StartScreen
          {...startScreenProps}
          onOpenRanking={() => setRankingOpen(true)}
          onOpenShop={() => setShopOpen(true)}
          themeId={themeId}
          onThemeChange={selectTheme}
          onLogout={() => {
            clearAuth();
          }}
        />
      </ThemeScope>
    );
  }

  return <PlayScreen {...playScreenProps} />;
}

export default App;
