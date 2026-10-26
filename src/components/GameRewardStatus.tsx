import type { GameRewardSession } from "../features/gameReward";
import { useGameReward } from "../hooks/useGameReward";
import CoinReward, { type CoinRewardProps } from "./CoinReward";

interface GameRewardStatusProps extends Omit<CoinRewardProps, "amount"> {
  session: GameRewardSession;
}

/** 성공한 정산의 코인만 표시한다. 로딩·오류 UI가 필요하면 useGameReward를 사용한다. */
export default function GameRewardStatus({
  session,
  ...displayProps
}: GameRewardStatusProps) {
  const { state } = useGameReward(session);

  if (state.status !== "success") return null;

  return <CoinReward amount={state.reward.earnedCoin} {...displayProps} />;
}
