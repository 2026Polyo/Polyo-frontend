// Shared gameplay/UI tunables. Scoring-specific constants live in features/augments.

/** Max snap distance (in cells) between the pointer and a valid placement. */
export const MAX_SNAP_DISTANCE = 1;

/** How long cleared cells stay highlighted before the board updates (ms). */
export const CLEAR_HIGHLIGHT_MS = 260;

/** localStorage key for the in-progress game. */
export const SAVED_GAME_KEY = "block-blast-current-game";
