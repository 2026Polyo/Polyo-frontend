import { createPieceInstance } from "../utils/pieceUtils";
import type { BonusTimeState, GameMode, PieceTemplate, Tray } from "../types";

export const BONUS_PLACEMENT_TARGET = 60;
export const BONUS_DURATION_MS = 15000;
export const BONUS_PIECE: PieceTemplate = { id: "monomino-single", cells: [[0, 0]] };

export function createBonusTimeState(): BonusTimeState {
  return { placements: 0, remainingMs: 0, regularTray: null };
}

export function createBonusTray(): Tray {
  return [createPieceInstance(BONUS_PIECE), createPieceInstance(BONUS_PIECE), createPieceInstance(BONUS_PIECE)];
}

// Bonus placements do not charge the next bonus or extend the current one.
export function advanceBonusPlacement(state: BonusTimeState, mode: GameMode, tray: Tray): BonusTimeState {
  if (mode === "hard" || state.remainingMs > 0) return state;
  const placements = state.placements + 1;
  return placements >= BONUS_PLACEMENT_TARGET
    ? { placements: 0, remainingMs: BONUS_DURATION_MS, regularTray: tray }
    : { ...state, placements };
}

export function getSavedBonusTime(value: unknown, isValidTray: (tray: unknown) => tray is Tray): BonusTimeState {
  const initial = createBonusTimeState();
  if (!value || typeof value !== "object") return initial;
  const saved = value as Partial<BonusTimeState>;
  const placements = Number.isInteger(saved.placements) && saved.placements! >= 0 && saved.placements! < BONUS_PLACEMENT_TARGET
    ? saved.placements! : 0;
  if (typeof saved.remainingMs !== "number" || !Number.isFinite(saved.remainingMs) || saved.remainingMs <= 0 || !isValidTray(saved.regularTray)) {
    return { ...initial, placements };
  }
  return { placements, remainingMs: Math.min(BONUS_DURATION_MS, saved.remainingMs), regularTray: saved.regularTray };
}

export function elapseBonusTime(state: BonusTimeState, elapsedMs: number): BonusTimeState {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0 || state.remainingMs <= 0) return state;
  return { ...state, remainingMs: Math.max(0, state.remainingMs - elapsedMs) };
}

// Undo restores placement progress, but cannot rewind or restart a running timer.
export function restoreBonusSnapshot(current: BonusTimeState, saved: BonusTimeState, tray: Tray): { bonusTime: BonusTimeState; tray: Tray } {
  if (saved.remainingMs <= 0) return { bonusTime: saved, tray };
  const remainingMs = Math.min(current.remainingMs, saved.remainingMs);
  return remainingMs > 0
    ? { bonusTime: { ...saved, remainingMs }, tray }
    : { bonusTime: { ...saved, remainingMs: 0, regularTray: null }, tray: saved.regularTray ?? tray };
}
