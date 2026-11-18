import type { GameRewardSession } from "../features/gameReward";
import { useGameReward } from "../hooks/useGameReward";
import CoinReward, { type CoinRewardProps } from "./CoinReward";

interface GameRewardStatusProps extends Omit<CoinRewardProps, "amount"> {
  session: GameRewardSession;
  showStatus?: boolean;
}

export default function GameRewardStatus({
  session,
  showStatus = false,
  ...displayProps
}: GameRewardStatusProps) {
  const { state, retry } = useGameReward(session);

  if (state.status === "success") return <CoinReward amount={state.reward.earnedCoin} {...displayProps} />;
  if (!showStatus) return null;
  if (state.status === "idle" || state.status === "pending") return <p role="status">코인 보상을 확인하는 중입니다.</p>;
  if (state.status !== "error") return null;
  return (
    <div>
      <p role="alert">{state.message}</p>
      {state.retryable && <button type="button" className="secondary-action" onClick={() => void retry()}>보상 다시 확인</button>}
    </div>
  );
}
