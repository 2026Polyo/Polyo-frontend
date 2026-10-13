// Maps how many lines were cleared in one move to a feedback tier. Both the clear sound and
// the on-board text burst use this so they always match.
export type ClearTier = "good" | "great" | "excellent";

export function getClearTier(cleared: number): ClearTier | null {
  if (cleared >= 4) return "excellent";
  if (cleared === 3) return "great";
  if (cleared === 2) return "good";
  return null;
}

export const CLEAR_TIER_LABEL: Record<ClearTier, string> = {
  good: "GOOD!",
  great: "GREAT!",
  excellent: "EXCELLENT!"
};
