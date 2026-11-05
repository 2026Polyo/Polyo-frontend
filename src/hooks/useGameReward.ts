import { useEffect, useSyncExternalStore } from "react";
import type { GameRewardSession } from "../features/gameReward";

/** 정산 상태와 재시도만 제공한다. 로딩·오류 화면은 각 게임 화면에서 선택한다. */
export function useGameReward(session: GameRewardSession) {
  const state = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );

  useEffect(() => {
    if (session.getSnapshot().status === "idle") void session.claim();
  }, [session]);

  return { state, retry: session.claim };
}
