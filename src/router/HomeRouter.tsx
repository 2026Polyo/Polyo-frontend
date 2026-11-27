import type { MutableRefObject } from "react";
import StartScreen from "../components/StartScreen";
import ProfileModal from "../components/ProfileModal";
import type { AuthUser } from "../api";
import type { GamePhase, GameSessionResult } from "../hooks/useGameSession";
import PlayScreen from "../screens/PlayScreen";
import PracticeScreen from "../screens/PracticeScreen";
import { ThemeScope } from "../components/theme";
import type { GameThemeId } from "../features/themes";

export interface HomeRouterProps {
  gamePhase: GamePhase;
  playScreenProps: GameSessionResult["playScreenProps"];
  startScreenProps: GameSessionResult["startScreenProps"];
  activeThemeId: GameThemeId;
  practice: { firstVisit: boolean } | null;
  profileOpen: boolean;
  user: AuthUser;
  restoreRoomFocus: MutableRefObject<string | null>;
  onSetPractice: (practice: { firstVisit: boolean } | null) => void;
  onSetProfileOpen: (open: boolean) => void;
  onUserChange: (user: AuthUser) => void;
  onOpenMultiplayer: () => void;
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
  profileOpen,
  user,
  restoreRoomFocus,
  onSetPractice,
  onSetProfileOpen,
  onUserChange,
  onOpenMultiplayer,
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

  return (
    <ThemeScope themeId={activeThemeId}>
      <StartScreen
        {...startScreenProps}
        themeId={activeThemeId}
        onMultiplayer={onOpenMultiplayer}
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
