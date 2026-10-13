import { useEffect, useRef, useState } from "react";
import "../styles/ScoreBoard.css";
import { Trophy } from "lucide-react";

interface ScoreBoardProps {
  best: number;
  score: number;
  /** Points the selected piece would add at the previewed spot (null when not previewing). */
  previewGain?: number | null;
}

function ScoreBoard({ best, score, previewGain }: ScoreBoardProps) {
  const [displayedScore, setDisplayedScore] = useState<number>(score);
  const [isCounting, setIsCounting] = useState<boolean>(false);
  const displayedScoreRef = useRef<number>(score);
  // Keep the last positive gain value so the span retains a number while fading out.
  const lastPositiveGainRef = useRef<number>(0);
  const showPreview = previewGain != null && previewGain > 0;
  if (showPreview) lastPositiveGainRef.current = previewGain;

  useEffect(() => {
    displayedScoreRef.current = displayedScore;
  }, [displayedScore]);

  useEffect(() => {
    let timerId: ReturnType<typeof window.setInterval> | undefined;
    let currentScore = displayedScoreRef.current;

    if (score <= currentScore) {
      displayedScoreRef.current = score;
      setDisplayedScore(score);
      setIsCounting(false);
      return undefined;
    }

    setIsCounting(true);
    // Scale the increment so large score jumps finish in roughly the same time
    // (~30 ticks) instead of crawling up one point at a time.
    const step = Math.max(1, Math.ceil((score - currentScore) / 30));
    timerId = window.setInterval(() => {
      currentScore = Math.min(score, currentScore + step);
      displayedScoreRef.current = currentScore;
      setDisplayedScore(currentScore);

      if (currentScore >= score) {
        window.clearInterval(timerId);
        setIsCounting(false);
      }
    }, 50);

    return () => window.clearInterval(timerId);
  }, [score]);

  return (
    <>
      <div className="best-score-badge" aria-label={`Best score ${best}`}>
        <Trophy size={20} aria-hidden="true" />
        <strong>{best}</strong>
      </div>
      <div className="score-row" aria-label="Current score">
        <div className="score-box">
          <strong className={isCounting ? "is-counting" : ""}>{displayedScore}</strong>
          <span
            className={`score-preview-gain${showPreview ? " is-visible" : ""}`}
            aria-hidden={showPreview ? undefined : "true"}
            aria-label={showPreview ? `배치 시 +${lastPositiveGainRef.current}점` : undefined}
          >
            +{lastPositiveGainRef.current}
          </span>
        </div>
      </div>
    </>
  );
}

export default ScoreBoard;
