import type { CSSProperties } from "react";
import "../styles/BonusTimeEffect.css";

// Mount once per bonus: the entrance clears the board, while the frame stays lit.
export default function BonusTimeEffect() {
  return (
    <div className="bonus-effect" aria-hidden="true">
      <div className="bonus-rays" />
      <div className="bonus-sparkles">
        {Array.from({ length: 12 }, (_, index) => (
          <span key={index} style={{ "--spark-index": index } as CSSProperties}>✦</span>
        ))}
      </div>
      <div className="bonus-announcement">
        <span className="bonus-announcement-kicker">BONUS TIME</span>
        <strong>보너스 타임!</strong>
        <span className="bonus-announcement-caption">한 칸 블록으로 신나게!</span>
      </div>
    </div>
  );
}
