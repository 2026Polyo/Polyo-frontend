import { ArrowDownToLine, RefreshCw, Undo2 } from "lucide-react";
import { getAugmentLevel, getSavedAugmentState } from "./augments";
import { cloneBoard } from "../utils/boardUtils";
import type {
  AugmentState,
  ItemDetails,
  ItemSlots,
  ItemType,
  SavedGame,
  UndoSnapshot,
  ItemStateValidators
} from "../types";

// One item is awarded each time the combo crosses a multiple of this number.
export const ITEM_COMBO_STEP = 10;
export const ITEM_DISCOUNT_PER_LEVEL = 2;
export const ITEM_COMBO_STEP_MIN = 2;
export const ITEM_GAIN_SCORE = 20;
export const ITEM_USE_SCORE = 15;

export function getItemComboStep(augmentState: AugmentState): number {
  const level = getAugmentLevel(augmentState, "item-discount");
  return Math.max(ITEM_COMBO_STEP_MIN, ITEM_COMBO_STEP - level * ITEM_DISCOUNT_PER_LEVEL);
}

export const MAX_UNDO_ITEMS = 3;
export const MAX_REROLL_ITEMS = 3;
export const MAX_ITEM_SLOTS = 3;
export const ITEM_TYPES: ItemType[] = ["undo", "reroll", "gravity"];
export const GRAVITY_FRAME_MS = 70;

export const itemDetails: ItemDetails = {
  reroll: { Icon: RefreshCw, description: "트레이 블록을 새로 뽑습니다.", label: "리롤", quantity: 1 },
  undo: { Icon: Undo2, description: "직전 턴으로 되돌립니다.", label: "되돌리기", quantity: 1 },
  gravity: { Icon: ArrowDownToLine, description: "보드의 모든 블록을 바닥으로 내립니다.", label: "중력", quantity: 1 }
};

export function createEmptyItemSlots(): ItemSlots {
  return [null, null, null];
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((key): key is string => typeof key === "string") : [];
}

function clampItemCount(count: unknown, max: number): number {
  return Math.max(0, Math.min(max, Number.isFinite(count) ? (count as number) : 0));
}

function clampUndoItems(count: unknown): number {
  return clampItemCount(count, MAX_UNDO_ITEMS);
}

function clampRerollItems(count: unknown): number {
  return clampItemCount(count, MAX_REROLL_ITEMS);
}

export function isValidItemType(type: unknown): type is ItemType {
  return ITEM_TYPES.includes(type as ItemType);
}

export function getRandomItemType(): ItemType {
  return ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
}

export function migrateItemSlots(savedGame: SavedGame): ItemSlots {
  if (Array.isArray(savedGame.itemSlots) && savedGame.itemSlots.length === MAX_ITEM_SLOTS) {
    return savedGame.itemSlots.map((item) => (isValidItemType(item) ? item : null)) as ItemSlots;
  }

  const migrated: ItemType[] = [];
  const legacyItems: [ItemType, number][] = [
    ["undo", clampUndoItems(savedGame.undoItems)],
    ["reroll", clampRerollItems(savedGame.rerollItems)]
  ];

  legacyItems.forEach(([type, count]) => {
    for (let index = 0; index < count && migrated.length < MAX_ITEM_SLOTS; index += 1) {
      migrated.push(type);
    }
  });

  return createEmptyItemSlots().map((_, index) => migrated[index] ?? null) as ItemSlots;
}

function isValidUndoSnapshot(
  snapshot: unknown,
  { isValidBoard, isValidTray }: ItemStateValidators
): snapshot is UndoSnapshot {
  return Boolean(
    snapshot &&
      typeof snapshot === "object" &&
      isValidBoard((snapshot as UndoSnapshot).board) &&
      isValidTray((snapshot as UndoSnapshot).tray) &&
      Number.isFinite((snapshot as UndoSnapshot).score)
  );
}

export interface SavedItemState {
  itemSlots: ItemSlots;
  undoSnapshot: UndoSnapshot | null;
}

export function getSavedItemState(savedGame: SavedGame, validators: ItemStateValidators): SavedItemState {
  const rawSnapshot = savedGame.undoSnapshot;

  return {
    itemSlots: migrateItemSlots(savedGame),
    undoSnapshot: isValidUndoSnapshot(rawSnapshot, validators)
      ? {
          board: cloneBoard((rawSnapshot as UndoSnapshot).board),
          augmentState: getSavedAugmentState(rawSnapshot as SavedGame),
          bombCells: toStringArray((rawSnapshot as UndoSnapshot).bombCells),
          boostCells: toStringArray((rawSnapshot as UndoSnapshot).boostCells),
          ghostCells: toStringArray((rawSnapshot as UndoSnapshot).ghostCells),
          goldenCells: toStringArray((rawSnapshot as UndoSnapshot).goldenCells),
          score: (rawSnapshot as UndoSnapshot).score,
          tray: (rawSnapshot as UndoSnapshot).tray
        }
      : null
  };
}
