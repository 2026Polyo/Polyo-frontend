import "./styles/App.css";
import "./styles/AuthScreen.css";
import "./styles/StartScreen.css";
import "./styles/AutoUndoFlash.css";
import { useState } from "react";
import AuthScreen from "./components/AuthScreen";
import StartScreen from "./components/StartScreen";
import { useGameSession } from "./hooks/useGameSession";
import PlayScreen from "./screens/PlayScreen";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, type AuthUser } from "./api/auth";
import ShopScreen from "./screens/ShopScreen";

function App() {
  const [shopOpen, setShopOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    if (!token || !storedUser) return null;
    try { return JSON.parse(storedUser) as AuthUser; } catch { return null; }
  });
  const { gamePhase, playScreenProps, startScreenProps } = useGameSession(Boolean(user));

  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  if (shopOpen) return <ShopScreen onGoHome={() => setShopOpen(false)} />;

  if (gamePhase === "start") {
    return (
      <StartScreen
        {...startScreenProps}
        onOpenShop={() => setShopOpen(true)}
        onLogout={() => {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(AUTH_USER_KEY);
          setUser(null);
        }}
      />
    );
  }

  return <PlayScreen {...playScreenProps} />;
}

export default App;
