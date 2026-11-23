import type { MutableRefObject } from "react";
import StartScreen from "../components/StartScreen";
import ProfileModal from "../components/ProfileModal";
import type { AuthUser } from "../api";
import type { GamePhase, GameSessionResult } from "../hooks/useGameSession";
import PlayScreen from "../screens/PlayScreen";
import CreateRoomScreen from "../screens/CreateRoomScreen";
import type { MatchRoomApi, MatchRoomDetails } from "../features/matchroom";
import MultiplayerScreen from "../screens/MultiplayerScreen";
import PracticeScreen from "../screens/PracticeScreen";
import { ThemeScope } from "../components/ThemeScope";
import type { GameThemeId } from "../features/themes/gameThemes";

type MultiplayerView = "home" | "lobby" | "create";

export interface HomeRouterProps {
  gamePhase: GamePhase;
  playScreenProps: GameSessionResult["playScreenProps"];
  startScreenProps: GameSessionResult["startScreenProps"];
  activeThemeId: GameThemeId;
  practice: { firstVisit: boolean } | null;
  multiplayerView: MultiplayerView;
  profileOpen: boolean;
  user: AuthUser;
  restoreRoomFocus: MutableRefObject<string | null>;
  matchRoomApi: MatchRoomApi;
  onEnterRoom: (room: MatchRoomDetails) => void;
  onSetPractice: (practice: { firstVisit: boolean } | null) => void;
  onSetMultiplayerView: (view: MultiplayerView) => void;
  onSetProfileOpen: (open: boolean) => void;
  onUserChange: (user: AuthUser) => void;
  onOpenRanking: () => void;
  onOpenShop: () => void;
  onOpenPractice: () => void;
  onLogout: () => void;
}

export default function HomeRouter({
  gamePhase,
  playScreenProps,
  startScreenProps,
  activeThemeId,
  practice,
  multiplayerView,
  profileOpen,
  user,
  restoreRoomFocus,
  matchRoomApi,
  onEnterRoom,
  onSetPractice,
  onSetMultiplayerView,
  onSetProfileOpen,
  onUserChange,
  onOpenRanking,
  onOpenShop,
  onOpenPractice,
  onLogout,
}: HomeRouterProps) {
  if (gamePhase !== "start") return <PlayScreen {...playScreenProps} />;

  if (practice) {
    return (
      <PracticeScreen
        initialTheme={activeThemeId}
        firstVisit={practice.firstVisit}
        onClose={() => {
          restoreRoomFocus.current = "start-logo-button";
          onSetPractice(null);
        }}
      />
    );
  }

  if (multiplayerView === "create") {
    return (
      <CreateRoomScreen
        onClose={() => {
          restoreRoomFocus.current = "lobby-create-room";
          onSetMultiplayerView("lobby");
        }}
        onCreateRoom={matchRoomApi.create}
        onEnterRoom={onEnterRoom}
      />
    );
  }

  if (multiplayerView === "lobby") {
    return (
      <MultiplayerScreen
        api={matchRoomApi}
        onBack={() => {
          restoreRoomFocus.current = "start-multiplayer";
          onSetMultiplayerView("home");
        }}
        onCreateRoom={() => onSetMultiplayerView("create")}
        onEnterRoom={onEnterRoom}
      />
    );
  }

  return (
    <ThemeScope themeId={activeThemeId}>
      <StartScreen
        {...startScreenProps}
        themeId={activeThemeId}
        onMultiplayer={() => onSetMultiplayerView("lobby")}
        onOpenRanking={onOpenRanking}
        onOpenProfile={() => onSetProfileOpen(true)}
        onOpenShop={onOpenShop}
        onOpenPractice={onOpenPractice}
        onLogout={onLogout}
      />
      {profileOpen && (
        <ProfileModal
          user={user}
          baseLoadout={startScreenProps.baseLoadout}
          loadoutIds={startScreenProps.loadoutIds}
          onClose={() => onSetProfileOpen(false)}
          onUserChange={onUserChange}
        />
      )}
    </ThemeScope>
  );
}
