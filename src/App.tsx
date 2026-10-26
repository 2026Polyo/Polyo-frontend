import { useState } from "react";
import "./styles/App.css";
import "./styles/StartScreen.css";
import "./styles/AutoUndoFlash.css";
import StartScreen from "./components/StartScreen";
import { useGameSession } from "./hooks/useGameSession";
import PlayScreen from "./screens/PlayScreen";
import ShopScreen from "./screens/ShopScreen";

function App() {
  const [shopOpen, setShopOpen] = useState(false);
  const { gamePhase, playScreenProps, startScreenProps } = useGameSession();

  if (shopOpen) return <ShopScreen onGoHome={() => setShopOpen(false)} />;

  if (gamePhase === "start") {
    return (
      <StartScreen {...startScreenProps} onOpenShop={() => setShopOpen(true)} />
    );
  }

  return <PlayScreen {...playScreenProps} />;
}

export default App;
