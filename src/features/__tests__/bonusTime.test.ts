import { describe, expect, it, vi, afterEach } from "vitest";
import {
  advanceBonusPlacement, BONUS_DURATION_MS, BONUS_PIECE, createBonusTimeState,
  createBonusTray, elapseBonusTime, getSavedBonusTime, restoreBonusSnapshot
} from "../bonusTime";
import { EMPTY_BOARD } from "../../constants/gameData";
import { createPieceInstance } from "../../utils/pieceUtils";
import { isValidTray, loadSavedGame, saveCurrentGame } from "../savedGame";
import { createInitialAugmentState } from "../augments";
import { rerollCandidates, rerollOnePiece, rerollSlots, deckPieceInstances } from "../../utils/tray";
import type { Tray } from "../../types";

const regularTray: Tray = [createPieceInstance({ id: "domino-horizontal", cells: [[0, 0], [0, 1]] }), null, null];
afterEach(() => vi.unstubAllGlobals());

describe("bonus time", () => {
  it("starts on the 60th normal placement, retaining the regular tray", () => {
    let state = createBonusTimeState();
    for (let index = 0; index < 59; index++) state = advanceBonusPlacement(state, "normal", regularTray);
    expect(state).toMatchObject({ placements: 59, remainingMs: 0 });
    state = advanceBonusPlacement(state, "normal", regularTray);
    expect(state).toEqual({ placements: 0, remainingMs: 15000, regularTray });
  });

  it("never starts in hard mode", () => {
    const initial = createBonusTimeState();
    let state = initial;
    for (let index = 0; index < 120; index++) state = advanceBonusPlacement(state, "hard", regularTray);
    expect(state).toEqual(initial);
  });

  it("does not charge or extend while active, then charges the next cycle", () => {
    const active = advanceBonusPlacement({ ...createBonusTimeState(), placements: 59 }, "normal", regularTray);
    const elapsed = elapseBonusTime(active, 2300);
    expect(advanceBonusPlacement(elapsed, "normal", regularTray)).toEqual(elapsed);
    expect(elapseBonusTime(elapsed, 12699).remainingMs).toBe(1);
    const ended = elapseBonusTime(elapsed, 12700);
    expect(ended.remainingMs).toBe(0);
    expect(advanceBonusPlacement(ended, "normal", regularTray).placements).toBe(1);
    expect(elapseBonusTime(ended, 1000).remainingMs).toBe(0);
    expect(elapseBonusTime(active, Number.NaN)).toEqual(active);
  });

  it("creates unique single-cell instances even when the player's deck has no singles", () => {
    const tray = createBonusTray();
    expect(tray.every(piece => piece?.cells.length === 1 && !piece.special)).toBe(true);
    expect(new Set(tray.map(piece => piece?.uid)).size).toBe(3);
  });

  it("keeps every reroll path single-cell when given the bonus pool", () => {
    const tray = createBonusTray();
    const pool = [BONUS_PIECE];
    const pieces = [
      ...rerollOnePiece(EMPTY_BOARD, tray, pool), ...rerollSlots(EMPTY_BOARD, tray, [0, 1, 2], pool),
      ...rerollCandidates(3, pool), ...deckPieceInstances(pool)
    ];
    expect(pieces.every(piece => piece?.cells.length === 1)).toBe(true);
  });

  it("undo cannot rewind time or bring back expired bonus pieces", () => {
    const saved = { placements: 0, remainingMs: 15000, regularTray };
    const tray = createBonusTray();
    expect(restoreBonusSnapshot({ ...saved, remainingMs: 1200 }, saved, tray).bonusTime.remainingMs).toBe(1200);
    expect(restoreBonusSnapshot(createBonusTimeState(), saved, tray)).toEqual({ bonusTime: createBonusTimeState(), tray: regularTray });
    const previous = { ...createBonusTimeState(), placements: 59 };
    expect(restoreBonusSnapshot(saved, previous, regularTray)).toEqual({ bonusTime: previous, tray: regularTray });
  });

  it("defaults legacy or corrupt bonus saves and clamps excessive durations", () => {
    for (const input of [undefined, null, {}, { placements: -1 }, { placements: 1.5 }, { remainingMs: Infinity }]) {
      expect(getSavedBonusTime(input, isValidTray)).toEqual(createBonusTimeState());
    }
    expect(getSavedBonusTime({ placements: 23 }, isValidTray).placements).toBe(23);
    expect(getSavedBonusTime({ remainingMs: 19000, regularTray }, isValidTray).remainingMs).toBe(BONUS_DURATION_MS);
    expect(getSavedBonusTime({ remainingMs: 2000, regularTray: [] }, isValidTray).remainingMs).toBe(0);
  });

  it("persists mode, bonus progress, remaining time and the original tray", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) });
    const bonusTime = { placements: 0, remainingMs: 2300, regularTray };
    saveCurrentGame({ gameMode: "normal", bonusTime, board: EMPTY_BOARD, augmentState: createInitialAugmentState(), bombCells: new Set(), boostCells: new Set(), ghostCells: new Set(), goldenCells: new Set(), deck: [], itemSlots: [null, null, null], score: 10, specialPieces: [], specialsGranted: 0, tray: createBonusTray(), undoSnapshot: null });
    expect(loadSavedGame()).toMatchObject({ gameMode: "normal", bonusTime });
    const [key, value] = [...storage][0];
    saveCurrentGame({ gameMode: "hard", bonusTime: createBonusTimeState(), board: EMPTY_BOARD, augmentState: createInitialAugmentState(), bombCells: new Set(), boostCells: new Set(), ghostCells: new Set(), goldenCells: new Set(), deck: [], itemSlots: [null, null, null], score: 999, specialPieces: [], specialsGranted: 0, tray: createBonusTray(), undoSnapshot: null });
    expect(storage.get(key)).toBe(value); // Hard mode cannot overwrite the resumable normal game.
    storage.set(key, JSON.stringify({ ...JSON.parse(value), gameMode: "hard" }));
    expect(loadSavedGame()).toBeNull();
  });
});
