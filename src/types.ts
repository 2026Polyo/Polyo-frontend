// ─── Primitives ───────────────────────────────────────────────────────────────

export type Cell = string | null;

/** 8×8 grid of Cell values. */
export type Board = Cell[][];

/** Coordinate pair [row, col] */
export type CellCoord = [number, number];

// ─── Specials ─────────────────────────────────────────────────────────────────

export type SpecialType = "ghost" | "line" | "echo" | "golden" | "bomb" | "fill" | "boost";

export interface SpecialMarks {
  bomb: Set<string>;
  boost: Set<string>;
  ghost: Set<string>;
  golden: Set<string>;
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

/** A piece definition from the catalog (no uid, no color assigned yet). */
export interface PieceTemplate {
  id: string;
  cells: CellCoord[];
  color?: string;
  special?: SpecialType;
  /** Only present on ghost templates; the base shape id. */
  baseId?: string;
}

/** A live piece instance with a unique id and an assigned color. */
export interface PieceInstance extends PieceTemplate {
  uid: string;
  color: string;
}

/** Tray always has exactly 3 slots; each slot is occupied or empty. */
export type Tray = [PieceInstance | null, PieceInstance | null, PieceInstance | null];

// ─── Augments ─────────────────────────────────────────────────────────────────

export type AugmentId =
  | "placement-score"
  | "clear-score"
  | "tray-combo"
  | "reroll-power"
  | "multi-line"
  | "all-clear"
  | "spread-fill"
  | "spread-clear"
  | "augment-discount"
  | "board-pressure"
  | "cell-placement-bonus"
  | "cell-clear-bonus"
  | "crack-clear"
  | "combo-accel"
  | "combo-retain"
  | "combo-correction"
  | "overheat"
  | "item-discount"
  | "item-gain-score"
  | "item-use-score"
  | "item-chain";

// Every augment belongs to a category, shown in the choice UI.
export type AugmentType = "combo" | "item" | "clear" | "multiline" | "placement" | "etc";

export type AugmentLevels = Record<AugmentId, number>;

export interface AugmentState {
  combo: number;
  levels: AugmentLevels;
  nextChoiceScore: number;
  scoreAtLastChoice: number;
  trayClearedLine: boolean;
  /** combo-retain: remaining charges that keep the combo alive when it would break. */
  comboRetainCharges: number;
  /** overheat: placements made since the last line clear. */
  placementsSinceClear: number;
  /** item-chain: an item was just used; the next placement scores more. */
  itemChainPending: boolean;
}

// ─── Items ────────────────────────────────────────────────────────────────────

export type ItemType = "undo" | "reroll" | "gravity";

export type ItemSlots = [ItemType | null, ItemType | null, ItemType | null];

export interface UndoSnapshot {
  augmentState: AugmentState;
  board: Board;
  bombCells: string[];
  boostCells: string[];
  ghostCells: string[];
  goldenCells: string[];
  score: number;
  tray: Tray;
}

// ─── Placement results ────────────────────────────────────────────────────────

export interface ClearedResult {
  board: Board;
  cleared: number;
  clearedCells: string[];
  clearedRows: number[];
  clearedCols: number[];
}

export interface PlacementResult extends ClearedResult {
  placedBoard: Board;
  overlappedCells: string[];
}

// ─── Board metrics ────────────────────────────────────────────────────────────

export interface BoardMetrics {
  cellSize: number;
  cellGap: number;
}

// ─── Score breakdown ──────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  allClearScore: number;
  boardPressureScore: number;
  clearScore: number;
  comboScore: number;
  multiLineScore: number;
  placementScore: number;
  total: number;
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export interface PlacementPosition {
  row: number;
  col: number;
}

export interface PointerPoint {
  x: number;
  y: number;
}

export interface AnchorOffset {
  x: number;
  y: number;
}

// ─── Saved game (raw JSON from localStorage) ─────────────────────────────────

export interface SavedGame {
  augmentState?: Partial<AugmentState> & { levels?: Partial<AugmentLevels> };
  board?: unknown;
  bombCells?: unknown;
  boostCells?: unknown;
  deck?: unknown;
  ghostCells?: unknown;
  goldenCells?: unknown;
  itemSlots?: unknown;
  score?: unknown;
  specialPieces?: unknown;
  specialsGranted?: unknown;
  tray?: unknown;
  undoSnapshot?: unknown;
  // Legacy fields that may appear in old saves
  undoItems?: unknown;
  rerollItems?: unknown;
}

// ─── Item system validators passed into getSavedItemState ─────────────────────

export interface ItemStateValidators {
  isValidBoard: (board: unknown) => board is Board;
  isValidTray: (tray: unknown) => tray is Tray;
}

// ─── Augment detail shape (used in augments.tsx) ──────────────────────────────

import type { LucideIcon } from "lucide-react";

export interface AugmentDetail {
  Icon: LucideIcon;
  id: AugmentId;
  label: string;
  summary: string;
  type: AugmentType;
}

export interface AugmentDetailWithLevel extends AugmentDetail {
  level: number;
}

// ─── Item detail shape (used in items.tsx) ────────────────────────────────────

export interface ItemDetail {
  Icon: LucideIcon;
  description: string;
  label: string;
  quantity: number;
}

export type ItemDetails = Record<ItemType, ItemDetail>;

// ─── Reroll replacement mode ──────────────────────────────────────────────────

export type RerollReplacementMode = "random" | "candidates" | "deck";
