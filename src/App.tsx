import "./styles/App.css";
import "./styles/AuthScreen.css";
import "./styles/StartScreen.css";
import "./styles/AutoUndoFlash.css";
import { useEffect, useRef, useState } from "react";
import AuthScreen from "./components/AuthScreen";
import StartScreen from "./components/StartScreen";
import { useGameSession } from "./hooks/useGameSession";
import PlayScreen from "./screens/PlayScreen";
import CreateRoomScreen from "./screens/CreateRoomScreen";
import { clearActiveRoom, loadActiveRoom, saveActiveRoom } from "./features/activeRoomStorage";
import { matchRoomApi } from "./features/matchroomApi";
import type { MatchRoomDetails } from "./features/matchroom";
import MatchGameScreen from "./screens/MatchGameScreen";
import MultiplayerScreen from "./screens/MultiplayerScreen";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, type AuthUser } from "./api/auth";

function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    if (!token || !storedUser) return null;
    try { return JSON.parse(storedUser) as AuthUser; } catch { return null; }
  });
  const { gamePhase, playScreenProps, startScreenProps } = useGameSession(Boolean(user));
  const [multiplayerView, setMultiplayerView] = useState<"home" | "lobby" | "create">("home");
  // Restored after a refresh, so a running match picks up where it was instead of being abandoned.
  const [activeRoom, setActiveRoom] = useState<MatchRoomDetails | null>(() => (user ? loadActiveRoom(user.id) : null));
  const restoreRoomFocus = useRef<string | null>(null);

  useEffect(() => {
    if (restoreRoomFocus.current) {
      document.getElementById(restoreRoomFocus.current)?.focus();
      restoreRoomFocus.current = null;
    }
  }, [multiplayerView]);

  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  const currentUser = user;
  function enterRoom(room: MatchRoomDetails) {
    saveActiveRoom(currentUser.id, room);
    setActiveRoom(room);
  }

  if (activeRoom) {
    return <MatchGameScreen onExit={() => {
      clearActiveRoom();
      setActiveRoom(null);
      setMultiplayerView("lobby");
    }} room={activeRoom} user={user} />;
  }

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
    return (
      <StartScreen
        {...startScreenProps}
        onLogout={() => {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(AUTH_USER_KEY);
          clearActiveRoom();
          setUser(null);
        }}
        onMultiplayer={() => setMultiplayerView("lobby")}
      />
    );
  }

  return <PlayScreen {...playScreenProps} />;
}

export default App;
