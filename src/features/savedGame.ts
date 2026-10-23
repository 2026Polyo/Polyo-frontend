import { getSavedBonusTime } from "./bonusTime";
import { SAVED_GAME_KEY } from "../constants/config";
import { DEFAULT_DECK, isValidDeck, normalizePieceId, SIZE } from "../constants/gameData";
import { getSavedAugmentState } from "./augments";
import { getSavedItemState, type SavedItemState } from "./items";
import { isValidSpecialPiece } from "./specials";
import { cloneBoard } from "../utils/boardUtils";
import type {
  AugmentState,
  BonusTimeState,
  GameMode,
  Board,
  ItemSlots,
  PieceInstance,
  PieceTemplate,
  SavedGame,
  Tray,
  UndoSnapshot
} from "../types";

export interface LoadedGame extends SavedItemState {
  gameMode: GameMode;
  bonusTime: BonusTimeState;
  augmentState: AugmentState;
  board: Board;
  bombCells: string[];
  boostCells: string[];
  deck: string[];
  ghostCells: string[];
  goldenCells: string[];
  score: number;
  specialPieces: PieceTemplate[];
  specialsGranted: number;
  tray: Tray;
}

export interface CurrentGameSnapshot {
  gameMode: GameMode;
  bonusTime: BonusTimeState;
  augmentState: AugmentState;
  board: Board;
  bombCells: Set<string>;
  boostCells: Set<string>;
  deck: string[];
  ghostCells: Set<string>;
  goldenCells: Set<string>;
  itemSlots: ItemSlots;
  score: number;
  specialPieces: PieceTemplate[];
  specialsGranted: number;
  tray: Tray;
  undoSnapshot: UndoSnapshot | null;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((key): key is string => typeof key === "string") : [];
}

function normalizeSavedDeck(deck: string[]): string[] {
  return deck
    .map((id) => normalizePieceId(id))
    .filter((id): id is string => typeof id === "string");
}

export function isValidBoard(board: unknown): board is Board {
  return (
    Array.isArray(board) &&
    board.length === SIZE &&
    board.every((row) => Array.isArray(row) && row.length === SIZE)
  );
}

function isValidPiece(piece: unknown): piece is PieceInstance {
  return (
    piece !== null &&
    typeof piece === "object" &&
    typeof (piece as PieceInstance).uid === "string" &&
    typeof (piece as PieceInstance).id === "string" &&
    typeof (piece as PieceInstance).color === "string" &&
    Array.isArray((piece as PieceInstance).cells) &&
    (piece as PieceInstance).cells.every(
      (cell) =>
        Array.isArray(cell) &&
        cell.length === 2 &&
        Number.isInteger(cell[0]) &&
        Number.isInteger(cell[1])
    )
  );
}

export function isValidTray(tray: unknown): tray is Tray {
  return (
    Array.isArray(tray) &&
    tray.length === 3 &&
    tray.every((piece) => piece === null || isValidPiece(piece))
  );
}

export function loadSavedGame(): LoadedGame | null {
  try {
    const raw = localStorage.getItem(SAVED_GAME_KEY);
    const savedGame = raw ? (JSON.parse(raw) as SavedGame) : null;
    if (!savedGame || savedGame.gameMode === "hard" || !isValidBoard(savedGame.board) || !isValidTray(savedGame.tray)) {
      return null;
    }

    return {
      gameMode: "normal",
      bonusTime: getSavedBonusTime(savedGame.bonusTime, isValidTray),
      augmentState: getSavedAugmentState(savedGame),
      board: cloneBoard(savedGame.board as Board),
      bombCells: toStringArray(savedGame.bombCells),
      boostCells: toStringArray(savedGame.boostCells),
      deck: isValidDeck(savedGame.deck) ? normalizeSavedDeck(savedGame.deck) : DEFAULT_DECK,
      ghostCells: toStringArray(savedGame.ghostCells),
      goldenCells: toStringArray(savedGame.goldenCells),
      score: Number.isFinite(savedGame.score) ? (savedGame.score as number) : 0,
      specialPieces: Array.isArray(savedGame.specialPieces)
        ? ((savedGame.specialPieces as unknown[]).filter(isValidSpecialPiece) as PieceTemplate[])
        : [],
      specialsGranted: Number.isFinite(savedGame.specialsGranted)
        ? Math.max(0, savedGame.specialsGranted as number)
        : 0,
      tray: savedGame.tray as Tray,
      ...getSavedItemState(savedGame, { isValidBoard, isValidTray })
    };
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVED_GAME_KEY);
  } catch {
    // Continue ending the session when storage is unavailable.
  }
}

export function saveCurrentGame({
  gameMode,
  bonusTime,
  augmentState,
  board,
  bombCells,
  boostCells,
  deck,
  ghostCells,
  goldenCells,
  itemSlots,
  score,
  specialPieces,
  specialsGranted,
  tray,
  undoSnapshot
}: CurrentGameSnapshot): void {
  if (gameMode !== "normal") return;
  try {
    localStorage.setItem(
      SAVED_GAME_KEY,
      JSON.stringify({
        gameMode,
        bonusTime,
        augmentState,
        board,
        bombCells: [...bombCells],
        boostCells: [...boostCells],
        deck,
        ghostCells: [...ghostCells],
        goldenCells: [...goldenCells],
        itemSlots,
        score,
        specialPieces,
        specialsGranted,
        tray,
        undoSnapshot
      })
    );
  } catch {
    // Continue without persistence when storage is unavailable or full.
  }
}
