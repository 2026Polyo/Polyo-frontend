import { Trophy } from "lucide-react";
import type { TrophyResult } from "../features/matchGame";
import "../styles/TrophyReward.css";

interface TrophyRewardProps {
  result: TrophyResult;
  className?: string;
}

/** Trophies the server confirmed for a won match: the gain and the new total. */
export default function TrophyReward({ result, className }: TrophyRewardProps) {
  const { delta, trophyCount } = result;
  if (!Number.isSafeInteger(delta) || delta <= 0 || !Number.isSafeInteger(trophyCount) || trophyCount < delta) return null;

  const gain = delta.toLocaleString("ko-KR");
  const total = trophyCount.toLocaleString("ko-KR");
  return (
    <div
      aria-label={`트로피 ${gain}개 획득, 보유 트로피 ${total}개`}
      className={["trophy-reward", className].filter(Boolean).join(" ")}
      role="status"
    >
      <span className="trophy-reward-gain" aria-hidden="true">
        <Trophy size="1em" />+{gain}
      </span>
      <span className="trophy-reward-total" aria-hidden="true">보유 트로피 {total}개</span>
    </div>
  );
}
