import "./styles/App.css";
import "./styles/StartScreen.css";
import "./styles/AutoUndoFlash.css";
import StartScreen from "./components/StartScreen";
import { useGameSession } from "./hooks/useGameSession";
import PlayScreen from "./screens/PlayScreen";
import { useEffect, useRef, useState } from "react";
import CreateRoomScreen from "./screens/CreateRoomScreen";
import { matchRoomApi } from "./features/matchroomApi";
import MultiplayerScreen from "./screens/MultiplayerScreen";

function App() {
  const { gamePhase, playScreenProps, startScreenProps } = useGameSession();
  const [multiplayerView, setMultiplayerView] = useState<"home" | "lobby" | "create">("home");
  const restoreRoomFocus = useRef<string | null>(null);

  useEffect(() => {
    if (restoreRoomFocus.current) {
      document.getElementById(restoreRoomFocus.current)?.focus();
      restoreRoomFocus.current = null;
    }
  }, [multiplayerView]);

  if (gamePhase === "start") {
    if (multiplayerView === "create") {
      return (
        <CreateRoomScreen
          onClose={() => {
            restoreRoomFocus.current = "lobby-create-room";
            setMultiplayerView("lobby");
          }}
          onCreateRoom={matchRoomApi.create}
        />
      );
    }
    if (multiplayerView === "lobby") {
      return <MultiplayerScreen api={matchRoomApi} onBack={() => {
        restoreRoomFocus.current = "start-multiplayer";
        setMultiplayerView("home");
      }} onCreateRoom={() => setMultiplayerView("create")} />;
    }
    return <StartScreen {...startScreenProps} onMultiplayer={() => setMultiplayerView("lobby")} />;
  }

  return <PlayScreen {...playScreenProps} />;
}

export default App;
