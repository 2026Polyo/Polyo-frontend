import { useEffect, useMemo, useState } from "react";
import { DEFAULT_DECK } from "../constants/gameData";
import {
  addToStash,
  addUnlockedBlock,
  loadBaseLoadout,
  loadLoadout,
  loadStash,
  loadUnlockedBlocks,
  MAX_BASE_DECK,
  MAX_LOADOUT,
  baseLoadoutsEqual,
  normalizeBaseLoadout,
  saveBaseLoadout,
  saveLoadout,
  saveStash,
  saveUnlockedBlocks
} from "../features/specialStash";
import type { PieceTemplate } from "../types";

export function useDeckBuilderState() {
  const [specialStash, setSpecialStash] = useState<PieceTemplate[]>(loadStash);
  const [loadoutIds, setLoadoutIds] = useState<string[]>(loadLoadout);
  const [baseLoadout, setBaseLoadout] = useState<string[]>(loadBaseLoadout);
  const [unlockedBlocks, setUnlockedBlocks] = useState<string[]>(loadUnlockedBlocks);

  const availableBaseIds = useMemo(() => [...DEFAULT_DECK, ...unlockedBlocks], [unlockedBlocks]);

  useEffect(() => { saveStash(specialStash); }, [specialStash]);
  useEffect(() => { saveLoadout(loadoutIds); }, [loadoutIds]);
  useEffect(() => { saveBaseLoadout(baseLoadout); }, [baseLoadout]);
  useEffect(() => { saveUnlockedBlocks(unlockedBlocks); }, [unlockedBlocks]);
  useEffect(() => {
    setBaseLoadout((current) => {
      const normalized = normalizeBaseLoadout(current, availableBaseIds);
      return baseLoadoutsEqual(current, normalized) ? current : normalized;
    });
  }, [availableBaseIds]);

  function addSpecialToDeck(id: string) {
    setLoadoutIds((current) =>
      current.includes(id) || current.length >= MAX_LOADOUT ? current : [...current, id]
    );
  }

  function removeSpecialFromDeck(id: string) {
    setLoadoutIds((current) => current.filter((entry) => entry !== id));
  }

  function addBaseBlock(id: string) {
    const available = new Set(availableBaseIds);
    setBaseLoadout((current) => {
      if (current.includes(id)) return current;
      const count = current.filter((entry) => available.has(entry)).length;
      return count >= MAX_BASE_DECK ? current : [...current, id];
    });
  }

  function removeBaseBlock(id: string) {
    const available = new Set(availableBaseIds);
    setBaseLoadout((current) => {
      const count = current.filter((entry) => available.has(entry)).length;
      if (count <= 1) return current;
      return current.filter((entry) => entry !== id);
    });
  }

  function addSpecialToStash(piece: PieceTemplate) {
    setSpecialStash((current) => addToStash(current, piece));
  }

  function unlockBaseBlock(id: string) {
    setUnlockedBlocks((current) => addUnlockedBlock(current, id));
  }

  return {
    addBaseBlock,
    addSpecialToDeck,
    addSpecialToStash,
    availableBaseIds,
    baseLoadout,
    loadoutIds,
    removeBaseBlock,
    removeSpecialFromDeck,
    specialStash,
    unlockedBlocks,
    unlockBaseBlock
  };
}
