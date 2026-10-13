import { useEffect, useState } from "react";

function useBestScore(score: number): number {
  const [best, setBest] = useState<number>(() => Number(localStorage.getItem("block-blast-best") || 0));

  useEffect(() => {
    if (score > best) {
      setBest(score);
      localStorage.setItem("block-blast-best", String(score));
    }
  }, [best, score]);

  return best;
}

export default useBestScore;
