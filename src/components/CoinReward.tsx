import { Coins } from "lucide-react";
import type { CSSProperties } from "react";
import "../styles/CoinReward.css";

export interface CoinRewardProps {
  amount: number;
  className?: string;
  style?: CSSProperties;
  iconSize?: number | string;
}

/** 지급이 확인된 코인만 표시한다. 위치와 디자인은 사용하는 화면에서 정한다. */
export default function CoinReward({
  amount,
  className,
  style,
  iconSize = "1em",
}: CoinRewardProps) {
  if (!Number.isSafeInteger(amount) || amount < 0) return null;

  const formattedAmount = amount.toLocaleString("ko-KR");

  return (
    <span
      className={["coin-reward", className].filter(Boolean).join(" ")}
      style={style}
      role="status"
      aria-label={`획득 코인 ${formattedAmount}`}
    >
      <Coins size={iconSize} aria-hidden="true" />
      <span aria-hidden="true">+{formattedAmount}</span>
    </span>
  );
}
