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
import { AUTH_EXPIRED_EVENT, AUTH_TOKEN_KEY, AUTH_USER_KEY, clearAuth, type AuthUser } from "./api/auth";
import ShopScreen from "./screens/ShopScreen";
import { useThemePreview } from "./hooks/useThemePreview";
import { ThemeScope } from "./components/ThemeScope";

function App() {
  const [shopOpen, setShopOpen] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    if (!token || !storedUser) return null;
    try { return JSON.parse(storedUser) as AuthUser; } catch { return null; }
  });
  const { themeId, selectTheme } = useThemePreview();
  const { gamePhase, playScreenProps, startScreenProps } =
    useGameSession(Boolean(user), themeId);

  useEffect(() => {
    function handleAuthExpired() {
      setUser(null);
      setShopOpen(false);
      setRankingOpen(false);
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, []);

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
