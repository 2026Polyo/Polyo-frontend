import "./styles/App.css";
import "./styles/StartScreen.css";
import "./styles/AutoUndoFlash.css";
import StartScreen from "./components/StartScreen";
import { useGameSession } from "./hooks/useGameSession";
import PlayScreen from "./screens/PlayScreen";

function App() {
  const { gamePhase, playScreenProps, startScreenProps } = useGameSession();

  if (gamePhase === "start") {
    return <StartScreen {...startScreenProps} />;
  }

  return <PlayScreen {...playScreenProps} />;
}

export default App;
