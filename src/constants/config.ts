// Shared gameplay/UI tunables. Scoring-specific constants live in features/augments.

/** Max snap distance (in cells) between the pointer and a valid placement. */
export const MAX_SNAP_DISTANCE = 1;

/** How long cleared cells stay highlighted before the board updates (ms). */
export const CLEAR_HIGHLIGHT_MS = 260;

/** Initial time allowed to place the next block in hard mode (ms). */
export const HARD_INITIAL_PLACEMENT_MS = 10000;

/** Hard mode never gives less than 2.8 seconds for the next placement. */
export const HARD_MIN_PLACEMENT_MS = 2800;

/** Time removed after each placement, based on the score after that placement. */
export function getHardPlacementDecayMs(score: number): number {
  if (score >= 200) return 200;
  if (score >= 100) return 100;
  return 0;
}

/** localStorage key for the in-progress game. */
export const SAVED_GAME_KEY = "block-blast-current-game";
