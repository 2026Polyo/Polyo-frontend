import { useEffect, useState } from "react";
import type { GameMode } from "../types";

const LEGACY_BEST_KEY = "block-blast-best";

function getBestKey(gameMode: GameMode): string {
  return `block-blast-best-${gameMode}`;
}

function readBestScore(gameMode: GameMode): number {
  const saved = localStorage.getItem(getBestKey(gameMode));
  if (saved !== null) return Number(saved) || 0;
  return gameMode === "normal" ? Number(localStorage.getItem(LEGACY_BEST_KEY) || 0) : 0;
}

function useBestScore(score: number, gameMode: GameMode): number {
  const bestKey = getBestKey(gameMode);
  const [best, setBest] = useState<number>(() => readBestScore(gameMode));

  useEffect(() => {
    setBest(readBestScore(gameMode));
  }, [gameMode]);

  useEffect(() => {
    if (score > best) {
      setBest(score);
      localStorage.setItem(bestKey, String(score));
    }
  }, [best, bestKey, score]);

  return best;
}

export default useBestScore;
