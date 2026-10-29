import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CLEAR_HIGHLIGHT_MS, getHardPlacementDecayMs, HARD_INITIAL_PLACEMENT_MS, HARD_MIN_PLACEMENT_MS, MAX_SNAP_DISTANCE } from "../constants/config";
import { DEFAULT_DECK, EMPTY_BOARD, getDeckPieces, PIECES } from "../constants/gameData";
import {
  advanceAugmentSchedule,
  chooseAugment,
  createInitialAugmentState,
  getAugmentLevel,
  getComboCorrectionBias,
  getNextAugmentStateAfterPlacement,
  getTotalAugmentLevels,
  shouldOfferAugmentChoice
} from "../features/augments";
import { BONUS_PIECE, advanceBonusPlacement, createBonusTimeState, createBonusTray, elapseBonusTime, restoreBonusSnapshot } from "../features/bonusTime";
import { CLEAR_TIER_LABEL, getClearTier } from "../features/clearFeedback";
import { GHOST_AUGMENT_INTERVAL } from "../features/ghosts";
import { resolvePlacement } from "../features/resolvePlacement";
import { clearSavedGame, loadSavedGame, saveCurrentGame } from "../features/savedGame";
import { createRewardChoices } from "../features/specials";
import {
  getLoadoutPieces,
  MAX_BASE_DECK,
  MAX_LOADOUT
} from "../features/specialStash";
import { cloneBoard } from "../utils/boardUtils";
import { createPieceInstance } from "../utils/pieceUtils";
import { canPlace, getClosestPlacement, getPlacementDistanceSquared, hasMove } from "../utils/placement";
import { nextTray } from "../utils/tray";
import useBestScore from "./useBestScore";
import { useComboEffect } from "./useComboEffect";
import { useDeckBuilderState } from "./useDeckBuilderState";
import { useGameAudio } from "./useGameAudio";
import { useItemSystem } from "./useItemSystem";
import { usePieceSelection } from "./usePieceSelection";
import { usePulseLabel } from "./usePulseLabel";
import type {
  AugmentId,
  AugmentState,
  Board as BoardType,
  BonusTimeState,
  GameMode,
  PieceInstance,
  PieceTemplate,
  SpecialMarks,
  Tray
} from "../types";
import type { Dispatch, SetStateAction } from "react";

const SPECIAL_CHOICE_COUNT = 3;
const HARD_SCORE_MULTIPLIER = 2;
const HARD_COMBO_MULTIPLIER = 2;

export type GamePhase = "start" | "playing";

interface SpecialMarksSource {
  bombCells?: string[];
  boostCells?: string[];
  ghostCells?: string[];
  goldenCells?: string[];
}

function createSpecialMarks(source: SpecialMarksSource = {}): SpecialMarks {
  return {
    bomb: new Set(source.bombCells ?? []),
    boost: new Set(source.boostCells ?? []),
    ghost: new Set(source.ghostCells ?? []),
    golden: new Set(source.goldenCells ?? [])
  };
}

function resolveMarkUpdate(
  value: SetStateAction<Set<string>>,
  current: Set<string>
): Set<string> {
  return typeof value === "function" ? value(current) : value;
}

export function useGameSession() {
  const [initialGame] = useState(loadSavedGame);
  const [gameMode, setGameMode] = useState<GameMode>(() => initialGame?.gameMode ?? "normal");
  const [startFlow, setStartFlow] = useState<"mode" | "continue" | null>(null);
  const pendingContinueRef = useRef<ReturnType<typeof loadSavedGame>>(null);
  const [bonusTime, setBonusTime] = useState<BonusTimeState>(() => initialGame?.bonusTime ?? createBonusTimeState());
  const bonusTimeRef = useRef(bonusTime);
  const bonusTickRef = useRef<number | null>(null);
  const [hardTimeRemainingMs, setHardTimeRemainingMs] = useState(0);
  const hardTimeRef = useRef(0);
  const hardTimeLimitRef = useRef(0);
  const hardTickRef = useRef<number | null>(null);
  const placementLockRef = useRef(false);

  function updateBonusTime(next: BonusTimeState) {
    bonusTimeRef.current = next;
    setBonusTime(next);
  }

  function updateHardTime(next: number) {
    const remaining = Math.max(0, next);
    hardTimeRef.current = remaining;
    setHardTimeRemainingMs(remaining);
  }

  function resetHardTimeLimit(nextLimit: number) {
    const limit = Math.max(0, nextLimit);
    hardTimeLimitRef.current = limit;
    updateHardTime(limit);
  }

  const [board, setBoard] = useState<BoardType>(() => initialGame?.board ?? cloneBoard(EMPTY_BOARD));
  const [deck, setDeck] = useState<string[]>(() => initialGame?.deck ?? DEFAULT_DECK);
  const [specialPieces, setSpecialPieces] = useState<PieceTemplate[]>(
    () => initialGame?.specialPieces ?? []
  );
  const [specialMarks, setSpecialMarks] = useState<SpecialMarks>(
    () => createSpecialMarks(initialGame ?? undefined)
  );
  const { bomb: bombCells, boost: boostCells, ghost: ghostCells, golden: goldenCells } = specialMarks;
  const setGhostCells = useCallback<Dispatch<SetStateAction<Set<string>>>>((value) => {
    setSpecialMarks((current) => ({ ...current, ghost: resolveMarkUpdate(value, current.ghost) }));
  }, []);
  const setGoldenCells = useCallback<Dispatch<SetStateAction<Set<string>>>>((value) => {
    setSpecialMarks((current) => ({ ...current, golden: resolveMarkUpdate(value, current.golden) }));
  }, []);
  const setBombCells = useCallback<Dispatch<SetStateAction<Set<string>>>>((value) => {
    setSpecialMarks((current) => ({ ...current, bomb: resolveMarkUpdate(value, current.bomb) }));
  }, []);
  const setBoostCells = useCallback<Dispatch<SetStateAction<Set<string>>>>((value) => {
    setSpecialMarks((current) => ({ ...current, boost: resolveMarkUpdate(value, current.boost) }));
  }, []);
  const deckPieces = useMemo<PieceTemplate[]>(
    () => [...getDeckPieces(deck), ...specialPieces],
    [deck, specialPieces]
  );
  const [tray, setTray] = useState<Tray>(
    () =>
      initialGame?.tray ??
      nextTray(initialGame?.board ?? EMPTY_BOARD, [
        ...getDeckPieces(initialGame?.deck ?? DEFAULT_DECK),
        ...(initialGame?.specialPieces ?? [])
      ])
  );
  const [clearingCells, setClearingCells] = useState<Set<string>>(() => new Set());
  const [score, setScore] = useState<number>(() => initialGame?.score ?? 0);
  const [augmentState, setAugmentState] = useState<AugmentState>(
    () => initialGame?.augmentState ?? createInitialAugmentState()
  );
  const [augmentChoiceOpen, setAugmentChoiceOpen] = useState(false);
  const [rewardPiece, setRewardPiece] = useState<PieceInstance | null>(null);
  const [specialChoices, setSpecialChoices] = useState<PieceTemplate[] | null>(null);
  const [specialsGranted, setSpecialsGranted] = useState<number>(() => initialGame?.specialsGranted ?? 0);
  const [deckModalOpen, setDeckModalOpen] = useState(false);
  const [startDeckOpen, setStartDeckOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gamePhase, setGamePhase] = useState<GamePhase>("start");
  const {
    addBaseBlock,
    addSpecialToDeck,
    addSpecialToStash,
    availableBaseIds,
    baseLoadout,
    loadoutIds,
    randomizeDeck,
    removeBaseBlock,
    removeSpecialFromDeck,
    specialStash,
    unlockedBlocks,
    unlockBaseBlock
  } = useDeckBuilderState();
  const availableBaseSet = useMemo(() => new Set(availableBaseIds), [availableBaseIds]);
  const selectedBaseDeck = useMemo(
    () => baseLoadout.filter((id) => availableBaseSet.has(id)),
    [availableBaseSet, baseLoadout]
  );
  const canStartNewGame = selectedBaseDeck.length === MAX_BASE_DECK;
  const [autoUndoFlash, setAutoUndoFlash] = useState(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useGameAudio();

  function playPop() {
    audio.resume();
    audio.playPop();
  }

  const availablePieces = tray.filter((p): p is PieceInstance => p !== null);
  const isClearing = clearingCells.size > 0;
  const isPlaying = gamePhase === "playing";
  const selectionBlocked = augmentChoiceOpen || Boolean(rewardPiece) || Boolean(specialChoices);

  const {
    anchorCell,
    boardMetrics,
    boardRef,
    clearSelection,
    closestPlacementCell,
    cursorAnchorOffset,
    cursorPiece,
    cursorPoint,
    handlePieceSelect,
    handlePieceActivate,
    hoverCell,
    invalidPreview,
    previewCells,
    previewClearingCells,
    selectedPiece,
    setHoverCell
  } = usePieceSelection({
    augmentChoiceOpen: selectionBlocked || settingsOpen || deckModalOpen || isClearing,
    availablePieces, board, isPlaying, onPlace: placePieceAt
  });

  const comboEffectValue = useComboEffect(augmentState.combo);
  const { label: clearLabel, pulseId: clearLabelId, pulse: pulseClearLabel } = usePulseLabel();
  const scoringAugmentState = augmentState;
  const scoreMultiplier = gameMode === "hard" ? HARD_SCORE_MULTIPLIER : 1;
  const comboMultiplier = gameMode === "hard" ? HARD_COMBO_MULTIPLIER : 1;

  const previewGain = useMemo<number | null>(() => {
    if (!selectedPiece || !closestPlacementCell || invalidPreview) return null;
    return resolvePlacement({
      augmentState: scoringAugmentState,
      board,
      bombCells,
      boostCells,
      col: closestPlacementCell.col,
      ghostCells,
      goldenCells,
      piece: selectedPiece,
      row: closestPlacementCell.row,
      preview: true,
      scoreMultiplier,
      comboMultiplier
    }).scoreGain;
  }, [
    augmentState,
    board,
    bombCells,
    boostCells,
    closestPlacementCell,
    ghostCells,
    goldenCells,
    invalidPreview,
    selectedPiece,
    scoreMultiplier,
    comboMultiplier
  ]);

  const {
    applyReroll,
    autoUndo,
    canUndo,
    cancelReroll,
    gravityAnimating,
    handleItemClick,
    itemSlots,
    rerollModalSlot,
    resetItems,
    restoreItems,
    saveUndoSnapshot,
    undoSnapshot
  } = useItemSystem({
    enabled: gameMode === "normal",
    augmentState,
    board,
    bombCells,
    boostCells,
    clearSelection,
    clearTimerRef,
    deckPieces: bonusTime.remainingMs > 0 ? [BONUS_PIECE] : deckPieces,
    bonusTime,
    restoreBonusTime: (saved, savedTray) => {
      const restored = restoreBonusSnapshot(bonusTimeRef.current, saved, savedTray);
      updateBonusTime(restored.bonusTime);
      bonusTickRef.current = performance.now();
      return restored.tray;
    },
    ghostCells,
    goldenCells,
    initialGame,
    isClearing,
    score,
    setAugmentState,
    setBoard,
    setBombCells,
    setBoostCells,
    setClearingCells,
    setGhostCells,
    setGoldenCells,
    setScore,
    setTray,
    tray
  });

  const noMovesLeft =
    isPlaying &&
    !isClearing &&
    !gravityAnimating &&
    availablePieces.length > 0 &&
    !hasMove(board, availablePieces);
  const hardTimedOut = isPlaying && gameMode === "hard" && hardTimeRemainingMs === 0;
  const gameOver = (noMovesLeft && !canUndo) || hardTimedOut;

  const bonusActive = gameMode === "normal" && bonusTime.remainingMs > 0;
  const bonusPaused = !isPlaying || gameOver || isClearing || gravityAnimating || selectionBlocked || settingsOpen || deckModalOpen || rerollModalSlot !== null;

  useEffect(() => {
    if (!isPlaying || gameMode !== "hard" || gameOver) {
      hardTickRef.current = null;
      return;
    }

    hardTickRef.current = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const previous = hardTickRef.current;
      hardTickRef.current = now;
      if (previous === null) return;

      const remaining = Math.max(0, hardTimeRef.current - (now - previous));
      updateHardTime(remaining);
      if (remaining === 0) clearSelection();
    }, 25);

    return () => {
      clearInterval(timer);
      hardTickRef.current = null;
    };
  }, [clearSelection, gameMode, gameOver, isPlaying]);

  function tickBonusTime() {
    const now = performance.now();
    const previous = bonusTickRef.current;
    bonusTickRef.current = now;
    const current = bonusTimeRef.current;
    if (previous === null || current.remainingMs <= 0) return false;
    const { remainingMs } = elapseBonusTime(current, now - previous);
    if (remainingMs === 0) {
      if (current.regularTray) setTray(current.regularTray);
      updateBonusTime({ ...current, remainingMs: 0, regularTray: null });
      clearSelection();
      return true;
    }
    updateBonusTime({ ...current, remainingMs });
    return false;
  }

  useEffect(() => {
    if (bonusPaused || bonusTime.remainingMs <= 0) {
      bonusTickRef.current = null;
      return;
    }
    bonusTickRef.current = performance.now();
    const timer = setInterval(tickBonusTime, 25);
    return () => { clearInterval(timer); bonusTickRef.current = null; };
    // The interval reads the latest bonus state through its ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bonusPaused, bonusTime.remainingMs > 0]);

  useEffect(() => {
    if (!noMovesLeft || !canUndo) return;
    if (!autoUndo()) return;
    setAutoUndoFlash(true);
    if (autoUndoTimerRef.current !== null) clearTimeout(autoUndoTimerRef.current);
    autoUndoTimerRef.current = setTimeout(() => setAutoUndoFlash(false), 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noMovesLeft, canUndo]);

  useEffect(() => {
    if (!isPlaying) return;
    saveCurrentGame({
      gameMode,
      bonusTime,
      augmentState: scoringAugmentState,
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
    });
  }, [
    gameMode,
    bonusTime.placements,
    Math.ceil(bonusTime.remainingMs / 1000),
    augmentState,
    board,
    bombCells,
    boostCells,
    deck,
    ghostCells,
    goldenCells,
    isPlaying,
    itemSlots,
    specialPieces,
    specialsGranted,
    score,
    tray,
    undoSnapshot
  ]);

  useEffect(() => {
    if (gameOver) audio.playGameOver();
  }, [gameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (augmentChoiceOpen) audio.playPopup();
  }, [augmentChoiceOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (rewardPiece) audio.playPopup();
  }, [rewardPiece]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (specialChoices) audio.playPopup();
  }, [specialChoices]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (gameMode !== "normal" || !isPlaying || gameOver || isClearing || augmentChoiceOpen || rewardPiece || specialChoices) return;
    if (!shouldOfferAugmentChoice(augmentState, score, bonusActive)) return;
    clearSelection();
    const specialDue =
      Math.floor(getTotalAugmentLevels(augmentState) / GHOST_AUGMENT_INTERVAL) > specialsGranted;
    const timer = setTimeout(() => {
      if (bonusTimeRef.current.remainingMs > 0) return;
      if (specialDue) {
        setSpecialChoices(createRewardChoices(SPECIAL_CHOICE_COUNT, unlockedBlocks));
      } else {
        setAugmentChoiceOpen(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    bonusActive,
    augmentChoiceOpen,
    augmentState,
    clearSelection,
    gameOver,
    gameMode,
    isClearing,
    isPlaying,
    rewardPiece,
    score,
    specialChoices,
    specialsGranted,
    unlockedBlocks
  ]);

  useEffect(() => () => {
    if (clearTimerRef.current !== null) clearTimeout(clearTimerRef.current);
    if (autoUndoTimerRef.current !== null) clearTimeout(autoUndoTimerRef.current);
  }, []);

  function clearGameState() {
    if (clearTimerRef.current !== null) clearTimeout(clearTimerRef.current);
    if (autoUndoTimerRef.current !== null) clearTimeout(autoUndoTimerRef.current);
    clearTimerRef.current = null;
    autoUndoTimerRef.current = null;
    setAutoUndoFlash(false);
    updateBonusTime(createBonusTimeState());
    resetHardTimeLimit(0);
    hardTickRef.current = null;
    bonusTickRef.current = null;
    setBoard(cloneBoard(EMPTY_BOARD));
    setSpecialPieces([]);
    setSpecialMarks(createSpecialMarks());
    setTray([null, null, null]);
    clearSelection();
    setClearingCells(new Set());
    setScore(0);
    setAugmentState(createInitialAugmentState());
    setAugmentChoiceOpen(false);
    setRewardPiece(null);
    setSpecialChoices(null);
    setSpecialsGranted(0);
    setDeckModalOpen(false);
    setStartDeckOpen(false);
    setSettingsOpen(false);
    resetItems();
    audio.resetComboSound();
  }

  function resetGame(deckIds: string[], carriedSpecials: PieceTemplate[]) {
    clearGameState();
    setSpecialPieces(carriedSpecials);
    setTray(nextTray(EMPTY_BOARD, [...getDeckPieces(deckIds), ...carriedSpecials]));
  }

  function startGame(mode: GameMode = gameMode) {
    setStartFlow(null);
    if (mode === "normal" && !canStartNewGame) {
      setStartDeckOpen(true);
      return;
    }

    setGameMode(mode);
    const gameDeck = mode === "hard" ? PIECES.map((piece) => piece.id) : selectedBaseDeck;
    setDeck(gameDeck);
    resetGame(gameDeck, mode === "hard" ? [] : getLoadoutPieces(specialStash, loadoutIds));
    resetHardTimeLimit(mode === "hard" ? HARD_INITIAL_PLACEMENT_MS : 0);
    setGamePhase("playing");
  }

  function selectGameMode(mode: GameMode) {
    playPop();
    const saved = mode === "normal" ? loadSavedGame() : null;
    if (saved && saved.gameMode === "normal" && saved.tray.some(Boolean) && hasMove(saved.board, saved.tray.filter((piece): piece is PieceInstance => piece !== null))) {
      pendingContinueRef.current = saved;
      setStartFlow("continue");
      return;
    }
    pendingContinueRef.current = null;
    startGame(mode);
  }

  function continueGame() {
    const saved = pendingContinueRef.current;
    if (!saved || saved.gameMode !== "normal") return;
    clearGameState();
    setGameMode("normal");
    setBoard(saved.board);
    setDeck(saved.deck);
    setSpecialPieces(saved.specialPieces);
    setSpecialMarks(createSpecialMarks(saved));
    setTray(saved.tray);
    setScore(saved.score);
    setAugmentState(saved.augmentState);
    setSpecialsGranted(saved.specialsGranted);
    updateBonusTime(saved.bonusTime);
    restoreItems(saved);
    pendingContinueRef.current = null;
    setStartFlow(null);
    setGamePhase("playing");
  }

  function quitGame() {
    clearGameState();
    setGamePhase("start");
    if (gameMode === "normal") clearSavedGame();
  }

  function goHomeFromSettings() {
    setSettingsOpen(false);
    clearSelection();
    setGamePhase("start");
  }

  function placePieceAt(piece: PieceInstance, row: number, col: number) {
    if (!isPlaying || selectionBlocked || settingsOpen || deckModalOpen || rerollModalSlot !== null || isClearing || gravityAnimating || !tray.some((entry) => entry?.uid === piece.uid) || !canPlace(board, piece, row, col)) return;
    if (gameMode === "hard" && hardTimeRef.current === 0) return;

    if (placementLockRef.current) return;
    if (tickBonusTime()) return;
    placementLockRef.current = true;
    queueMicrotask(() => { placementLockRef.current = false; });
    audio.resume();
    audio.playPlacement();

    const outcome = resolvePlacement({
      augmentState: scoringAugmentState,
      board,
      bombCells,
      boostCells,
      col,
      ghostCells,
      goldenCells,
      piece,
      row,
      scoreMultiplier,
      comboMultiplier
    });
    audio.playClearFeedback(outcome.cleared);
    const clearTier = getClearTier(outcome.cleared);
    if (clearTier) pulseClearLabel(CLEAR_TIER_LABEL[clearTier]);

    setBoard(outcome.displayBoard);
    setClearingCells(outcome.clearingCells);
    setScore((current) => current + outcome.scoreGain);
    setSpecialMarks({
      bomb: outcome.bombCells,
      boost: outcome.boostCells,
      ghost: outcome.ghostCells,
      golden: outcome.goldenCells
    });

    const updatedTray = tray.map((p) => (p?.uid === piece.uid ? null : p)) as Tray;
    const trayCompleted = updatedTray.every((p) => !p);
    const trayClearedLine = augmentState.trayClearedLine || outcome.cleared > 0;
    if (trayCompleted && !trayClearedLine) audio.resetComboSound();
    const previousBonus = bonusTimeRef.current;
    const refreshedTray = trayCompleted
      ? (previousBonus.remainingMs > 0 ? createBonusTray() : nextTray(outcome.settledBoard, deckPieces, getComboCorrectionBias(augmentState)))
      : updatedTray;
    saveUndoSnapshot();
    const nextBonus = advanceBonusPlacement(previousBonus, gameMode, refreshedTray);
    const bonusStarted = previousBonus.remainingMs === 0 && nextBonus.remainingMs > 0;
    updateBonusTime(nextBonus);
    if (gameMode === "hard") {
      const placementDecay = getHardPlacementDecayMs(score + outcome.scoreGain);
      resetHardTimeLimit(Math.max(HARD_MIN_PLACEMENT_MS, hardTimeLimitRef.current - placementDecay));
    }
    if (bonusStarted) bonusTickRef.current = performance.now();
    setAugmentState((current) => getNextAugmentStateAfterPlacement(current, { cleared: outcome.cleared, trayCompleted }));
    setTray(bonusStarted ? createBonusTray() : refreshedTray);
    clearSelection();

    if (outcome.clearingCells.size) {
      if (clearTimerRef.current !== null) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => {
        setBoard(outcome.settledBoard);
        setClearingCells(new Set());
      }, CLEAR_HIGHLIGHT_MS);
    }
  }

  function handleCellClick(row: number, col: number) {
    if (selectionBlocked || !selectedPiece) return;
    const targetCell = anchorCell
      ? { row: row - anchorCell[0], col: col - anchorCell[1] }
      : { row, col };
    const closest = getClosestPlacement(board, selectedPiece, targetCell);
    if (!closest) return;
    if (getPlacementDistanceSquared(targetCell, closest) > MAX_SNAP_DISTANCE ** 2) return;
    placePieceAt(selectedPiece, closest.row, closest.col);
  }

  function handleAugmentChoose(augmentId: AugmentId) {
    setAugmentState((current) => chooseAugment(current, augmentId, score));
    setAugmentChoiceOpen(false);
  }

  function handleSpecialChoose(template: PieceTemplate) {
    if (template.special) {
      setSpecialPieces((current) => [...current, template]);
      addSpecialToStash(template);
    } else {
      unlockBaseBlock(template.id);
      setDeck((current) => [...current, template.id]);
    }
    setRewardPiece(createPieceInstance(template));
    setSpecialChoices(null);
    setSpecialsGranted((count) => count + 1);
    setAugmentState((current) => advanceAugmentSchedule(current, score));
  }

  const best = useBestScore(score, gameMode);

  function buildPlayScreenProps() {
    return {
      augmentState,
      autoUndoFlash,
      bonusTime,
      gameMode,
      hardTimeRemainingMs,
      best,
      board: {
        board,
        boardMetrics,
        boardRef,
        clearLabel,
        clearLabelId,
        clearingCells,
        cursorAnchorOffset,
        cursorPiece,
        cursorPoint,
        handleCellClick,
        hoverCell,
        invalidPreview,
        previewCells,
        previewClearingCells,
        selectedPiece,
        setHoverCell
      },
      comboEffectValue,
      gameOver,
      gravityAnimating,
      handleItemClick: (item: Parameters<typeof handleItemClick>[0], index: number) => {
        if (bonusPaused || tickBonusTime()) return;
        handleItemClick(item, index);
      },
      isClearing,
      itemSlots,
      onOpenDeckModal: () => { playPop(); setDeckModalOpen(true); },
      previewGain,
      score,
      modals: {
        augmentChoiceOpen,
        deckModalOpen,
        deckPieces,
        rerollPieces: bonusTime.remainingMs > 0 ? [BONUS_PIECE] : deckPieces,
        handleAugmentChoose,
        handleSpecialChoose,
        onCloseDeckModal: () => setDeckModalOpen(false),
        onConfirmReward: () => setRewardPiece(null),
        onGameOverGoHome: () => setGamePhase("start"),
        onGameOverRestart: () => startGame(),
        rewardPiece,
        rerollLevel: getAugmentLevel(augmentState, "reroll-power"),
        rerollModalSlot,
        specialChoices,
        applyReroll,
        cancelReroll
      },
      settings: {
        open: settingsOpen,
        onClose: () => setSettingsOpen(false),
        onGoHome: goHomeFromSettings,
        onQuit: quitGame,
        onToggle: () => { playPop(); setSettingsOpen((open) => !open); }
      },
      tray: {
        clearSelection,
        handlePieceSelect,
        handlePieceActivate,
        pieces: tray,
        selectedPiece
      },
      undoSnapshot
    };
  }

  function buildStartScreenProps() {
    return {
      availableBaseIds,
      baseLoadout,
      best,
      canStartNewGame,
      loadoutIds,
      startFlow,
      onModeSelect: selectGameMode,
      onCloseStartFlow: () => setStartFlow(null),
      onStartFresh: () => { playPop(); startGame("normal"); },
      maxBase: MAX_BASE_DECK,
      maxSpecial: MAX_LOADOUT,
      score,
      startDeckOpen,
      stash: specialStash,
      onAddBase: addBaseBlock,
      onAddSpecial: addSpecialToDeck,
      onCloseDeck: () => setStartDeckOpen(false),
      onContinue: () => { playPop(); continueGame(); },
      onNewGame: () => { playPop(); setStartFlow("mode"); },
      onOpenDeck: () => { playPop(); setStartDeckOpen(true); },
      onRemoveBase: removeBaseBlock,
      onRemoveSpecial: removeSpecialFromDeck,
      onRandomizeDeck: randomizeDeck
    };
  }

  return {
    gamePhase,
    playScreenProps: buildPlayScreenProps(),
    startScreenProps: buildStartScreenProps()
  };
}
