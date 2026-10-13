import { Home, RotateCcw } from "lucide-react";
import "../styles/GameOver.css";

interface GameOverProps {
  best: number;
  onGoHome: () => void;
  onRestart: () => void;
  score: number;
}

function GameOver({ best, onGoHome, onRestart, score }: GameOverProps) {
  return (
    <div className="game-over" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
      <div className="game-over-score" aria-label="Final score">
        <span>Score</span>
        <strong>{score}</strong>
      </div>
      <h2 id="game-over-title">Game Over</h2>
      <div className="game-over-best" aria-label="Best score">
        <span>Best</span>
        <strong>{best}</strong>
      </div>
      <div className="game-over-actions">
        <button className="primary-action" onClick={onRestart} type="button">
          <RotateCcw size={18} aria-hidden="true" />
          Retry
        </button>
        <button className="secondary-action" onClick={onGoHome} type="button">
          <Home size={18} aria-hidden="true" />
          홈으로
        </button>
      </div>
    </div>
  );
}

export default GameOver;
