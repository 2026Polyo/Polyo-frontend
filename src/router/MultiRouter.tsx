import type { MutableRefObject } from "react";
import type { MatchRoomApi, MatchRoomDetails } from "../features/multi";
import { CreateRoomScreen, MultiplayerScreen } from "../screens/multi";

export type MultiplayerView = "home" | "lobby" | "create";

export interface MultiRouterProps {
  view: MultiplayerView;
  restoreRoomFocus: MutableRefObject<string | null>;
  matchRoomApi: MatchRoomApi;
  onEnterRoom: (room: MatchRoomDetails) => void;
  onSetView: (view: MultiplayerView) => void;
}

export default function MultiRouter({
  view,
  restoreRoomFocus,
  matchRoomApi,
  onEnterRoom,
  onSetView,
}: MultiRouterProps) {
  if (view === "create") {
    return (
      <CreateRoomScreen
        onClose={() => {
          restoreRoomFocus.current = "lobby-create-room";
          onSetView("lobby");
        }}
        onCreateRoom={matchRoomApi.create}
        onEnterRoom={onEnterRoom}
      />
    );
  }

  if (view === "lobby") {
    return (
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

  return null;
}
