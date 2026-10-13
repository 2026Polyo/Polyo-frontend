import { useEffect, useRef, useState } from "react";
import { getAugmentLevel, getSavedAugmentState } from "../features/augments";
import {
  createEmptyItemSlots,
  getItemComboStep,
  getRandomItemType,
  GRAVITY_FRAME_MS,
  ITEM_GAIN_SCORE,
  ITEM_USE_SCORE,
  type SavedItemState
} from "../features/items";
import { cloneBoard, simulateGravity } from "../utils/boardUtils";
import { rerollOnePiece } from "../utils/tray";
import type {
  AugmentState,
  Board,
  ItemSlots,
  ItemType,
  PieceTemplate,
  SavedGame,
  Tray,
  UndoSnapshot
} from "../types";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

interface UseItemSystemArgs {
  augmentState: AugmentState;
  board: Board;
  bombCells: Set<string>;
  boostCells: Set<string>;
  clearSelection: () => void;
  clearTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  deckPieces: PieceTemplate[];
  ghostCells: Set<string>;
  goldenCells: Set<string>;
  initialGame: (SavedItemState & { score?: number }) | null;
  isClearing: boolean;
  score: number;
  setBoard: Dispatch<SetStateAction<Board>>;
  setAugmentState: Dispatch<SetStateAction<AugmentState>>;
  setBombCells: Dispatch<SetStateAction<Set<string>>>;
  setBoostCells: Dispatch<SetStateAction<Set<string>>>;
  setClearingCells: Dispatch<SetStateAction<Set<string>>>;
  setGhostCells: Dispatch<SetStateAction<Set<string>>>;
  setGoldenCells: Dispatch<SetStateAction<Set<string>>>;
  setScore: Dispatch<SetStateAction<number>>;
  setTray: Dispatch<SetStateAction<Tray>>;
  tray: Tray;
}

export function useItemSystem({
  augmentState,
  board,
  bombCells,
  boostCells,
  clearSelection,
  clearTimerRef,
  deckPieces,
  ghostCells,
  goldenCells,
  initialGame,
  isClearing,
  score,
  setBoard,
  setAugmentState,
  setBombCells,
  setBoostCells,
  setClearingCells,
  setGhostCells,
  setGoldenCells,
  setScore,
  setTray,
  tray
}: UseItemSystemArgs) {
  const [itemSlots, setItemSlots] = useState<ItemSlots>(
    () => initialGame?.itemSlots ?? createEmptyItemSlots()
  );
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(
    () => initialGame?.undoSnapshot ?? null
  );
  const [rerollModalSlot, setRerollModalSlot] = useState<number | null>(null);
  const [gravityAnimating, setGravityAnimating] = useState(false);
  const gravityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const comboMilestoneRef = useRef(augmentState.combo);

  useEffect(() => () => {
    if (gravityTimerRef.current !== null) clearInterval(gravityTimerRef.current);
  }, []);

  useEffect(() => {
    const combo = augmentState.combo;
    const prevCombo = comboMilestoneRef.current;
    comboMilestoneRef.current = combo;
    if (combo <= prevCombo) return;

    const step = getItemComboStep(augmentState);
    const itemsEarned = Math.floor(combo / step) - Math.floor(prevCombo / step);
    if (itemsEarned <= 0) return;

    let placed = 0;
    setItemSlots((current) => {
      const nextSlots = [...current] as ItemSlots;
      let itemsToAward = itemsEarned;

      for (let index = 0; index < nextSlots.length && itemsToAward > 0; index += 1) {
        if (!nextSlots[index]) {
          nextSlots[index] = getRandomItemType();
          itemsToAward -= 1;
          placed += 1;
        }
      }

      return nextSlots;
    });

    const gainLevel = getAugmentLevel(augmentState, "item-gain-score");
    if (gainLevel > 0 && placed > 0) setScore((current) => current + placed * gainLevel * ITEM_GAIN_SCORE);
  }, [augmentState, setScore]);

  function clearItemSlot(slotIndex: number) {
    setItemSlots((current) =>
      current.map((item, index) => (index === slotIndex ? null : item)) as ItemSlots
    );
  }

  function resetItems() {
    if (gravityTimerRef.current !== null) clearInterval(gravityTimerRef.current);
    gravityTimerRef.current = null;
    setGravityAnimating(false);
    comboMilestoneRef.current = 0;
    setItemSlots(createEmptyItemSlots());
    setUndoSnapshot(null);
    setRerollModalSlot(null);
  }

  function saveUndoSnapshot() {
    setUndoSnapshot({
      augmentState,
      board: cloneBoard(board),
      bombCells: [...bombCells],
      boostCells: [...boostCells],
      ghostCells: [...ghostCells],
      goldenCells: [...goldenCells],
      score,
      tray
    });
  }

  function onItemUsed() {
    const useLevel = getAugmentLevel(augmentState, "item-use-score");
    if (useLevel > 0) setScore((current) => current + useLevel * ITEM_USE_SCORE);
    if (getAugmentLevel(augmentState, "item-chain") > 0) {
      setAugmentState((current) => ({ ...current, itemChainPending: true }));
    }
  }

  function handleUndo(slotIndex: number) {
    if (isClearing || !undoSnapshot || itemSlots[slotIndex] !== "undo") return;

    if (clearTimerRef.current !== null) clearTimeout(clearTimerRef.current);
    setAugmentState(getSavedAugmentState(undoSnapshot as unknown as SavedGame));
    setBoard(cloneBoard(undoSnapshot.board));
    setTray(undoSnapshot.tray);
    setScore(undoSnapshot.score);
    setGhostCells(new Set(undoSnapshot.ghostCells ?? []));
    setGoldenCells(new Set(undoSnapshot.goldenCells ?? []));
    setBombCells(new Set(undoSnapshot.bombCells ?? []));
    setBoostCells(new Set(undoSnapshot.boostCells ?? []));
    setClearingCells(new Set());
    clearItemSlot(slotIndex);
    setUndoSnapshot(null);
    clearSelection();
    onItemUsed();
  }

  const canUndo = !isClearing && undoSnapshot !== null && itemSlots.includes("undo");

  function autoUndo(): boolean {
    if (!canUndo) return false;
    const slotIndex = itemSlots.findIndex((item) => item === "undo");
    if (slotIndex === -1) return false;
    handleUndo(slotIndex);
    return true;
  }

  function handleReroll(slotIndex: number) {
    if (isClearing || itemSlots[slotIndex] !== "reroll" || !tray.some(Boolean)) return;

    const rerollLevel = getAugmentLevel(augmentState, "reroll-power");
    if (rerollLevel <= 0) {
      setTray(rerollOnePiece(board, tray, deckPieces));
      clearItemSlot(slotIndex);
      clearSelection();
      onItemUsed();
      return;
    }

    clearSelection();
    setRerollModalSlot(slotIndex);
  }

  function applyReroll(nextTrayPieces: Tray) {
    setTray(nextTrayPieces);
    if (rerollModalSlot !== null) {
      clearItemSlot(rerollModalSlot);
      onItemUsed();
    }
    setRerollModalSlot(null);
  }

  function cancelReroll() {
    setRerollModalSlot(null);
  }

  function handleGravity(slotIndex: number) {
    if (isClearing || gravityAnimating || itemSlots[slotIndex] !== "gravity") return;

    const { frames, finalBoard, moved } = simulateGravity(board);
    if (!frames.length) return;

    clearSelection();
    clearItemSlot(slotIndex);
    onItemUsed();
    setGravityAnimating(true);

    let frameIndex = 0;
    if (gravityTimerRef.current !== null) clearInterval(gravityTimerRef.current);
    gravityTimerRef.current = setInterval(() => {
      if (frameIndex < frames.length) {
        setBoard(frames[frameIndex]);
        frameIndex += 1;
        return;
      }

      if (gravityTimerRef.current !== null) clearInterval(gravityTimerRef.current);
      gravityTimerRef.current = null;

      const remap = (cells: Set<string>) =>
        new Set([...cells].flatMap((key) => (moved.has(key) ? [moved.get(key)!] : [])));
      setBoard(finalBoard);
      setGhostCells(remap);
      setGoldenCells(remap);
      setBombCells(remap);
      setBoostCells(remap);
      setGravityAnimating(false);
    }, GRAVITY_FRAME_MS);
  }

  function handleItemClick(item: ItemType | null, slotIndex: number) {
    if (gravityAnimating) return;

    if (item === "undo") {
      handleUndo(slotIndex);
      return;
    }

    if (item === "reroll") {
      handleReroll(slotIndex);
      return;
    }

    if (item === "gravity") {
      handleGravity(slotIndex);
    }
  }

  return {
    applyReroll,
    autoUndo,
    canUndo,
    cancelReroll,
    gravityAnimating,
    handleItemClick,
    itemSlots,
    rerollModalSlot,
    resetItems,
    saveUndoSnapshot,
    undoSnapshot
  };
}
