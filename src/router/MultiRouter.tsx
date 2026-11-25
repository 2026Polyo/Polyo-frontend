import type { MutableRefObject, ReactNode } from "react";
import { ThemeScope } from "../components/theme";
import type { MatchRoomApi, MatchRoomDetails } from "../features/multi";
import type { GameThemeId } from "../features/themes";
import { CreateRoomScreen, MultiplayerScreen } from "../screens/multi";

export type MultiplayerView = "home" | "lobby" | "create";

export interface MultiRouterProps {
  themeId: GameThemeId;
  view: MultiplayerView;
  restoreRoomFocus: MutableRefObject<string | null>;
  matchRoomApi: MatchRoomApi;
  onEnterRoom: (room: MatchRoomDetails) => void;
  onSetView: (view: MultiplayerView) => void;
}

export default function MultiRouter({
  themeId,
  view,
  restoreRoomFocus,
  matchRoomApi,
  onEnterRoom,
  onSetView,
}: MultiRouterProps) {
  let screen: ReactNode = null;

  if (view === "create") {
    screen = (
      <CreateRoomScreen
        onClose={() => {
          restoreRoomFocus.current = "lobby-create-room";
          onSetView("lobby");
        }}
        onCreateRoom={matchRoomApi.create}
        onEnterRoom={onEnterRoom}
      />
    );
  } else if (view === "lobby") {
    screen = (
      <MultiplayerScreen
        api={matchRoomApi}
        onBack={() => {
          restoreRoomFocus.current = "start-multiplayer";
          onSetView("home");
        }}
        onCreateRoom={() => onSetView("create")}
        onEnterRoom={onEnterRoom}
      />
    );
  }

  return <ThemeScope themeId={themeId}>{screen}</ThemeScope>;
}
