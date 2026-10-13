import { PIECES } from "../constants/gameData";
import { createPieceInstance, randomPiece, randomPieceTemplate } from "./pieceUtils";
import { getPlacements, placePiece } from "./placement";
import { shuffle } from "./shuffle";
import type { Board, PieceInstance, PieceTemplate, Tray } from "../types";

const TRAY_SIZE = 3;
const RANDOM_TRAY_ATTEMPTS = 300;
const SIMULATION_COLOR = "cyan";
// The solvability search runs synchronously on the main thread; this caps how long it may
// block before falling back to a random tray. If tray generation ever becomes a visible
// jank source, move this search to a Web Worker rather than raising the budget.
const TRAY_BUDGET_MS = 150;

function boardKey(board: Board): string {
  return board.map((row) => row.map((cell) => (cell ? 1 : 0)).join("")).join("");
}

function canCompleteTrayMemo(board: Board, pieces: PieceTemplate[], memo: Map<string, boolean>): boolean {
  if (!pieces.length) return true;

  // Order of remaining pieces doesn't change solvability, so sort ids for cache hits.
  const key = `${boardKey(board)}|${pieces.map((piece) => piece.id).sort().join(",")}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

  const result = pieces.some((piece, pieceIndex) => {
    const remainingPieces = pieces.filter((_, index) => index !== pieceIndex);
    const placements = getPlacements(board, piece);

    return placements.some(({ row, col }) => {
      const placed = placePiece(board, { ...piece, color: piece.color ?? SIMULATION_COLOR, uid: "sim" }, row, col);
      return canCompleteTrayMemo(placed.board, remainingPieces, memo);
    });
  });

  memo.set(key, result);
  return result;
}

function findSolvableTray(
  board: Board,
  memo: Map<string, boolean>,
  deck: PieceTemplate[],
  deadline: number
): PieceTemplate[] | null {
  // Shuffle to avoid always returning the same tray on repeated calls.
  const shuffled = shuffle(deck);
  for (const first of shuffled) {
    if (Date.now() > deadline) return null;
    for (const second of shuffled) {
      for (const third of shuffled) {
        const tray = [first, second, third];
        if (canCompleteTrayMemo(board, tray, memo)) {
          return tray;
        }
      }
    }
  }
  return null;
}

// Replace the given tray slots with new random pieces from the deck, keeping the tray solvable.
export function rerollSlots(
  board: Board,
  tray: Tray,
  slotIndices: number[],
  deck: PieceTemplate[] = PIECES
): Tray {
  const targets = new Set(slotIndices);
  const memo = new Map<string, boolean>();
  const deadline = Date.now() + TRAY_BUDGET_MS;

  for (let attempt = 0; attempt < RANDOM_TRAY_ATTEMPTS; attempt += 1) {
    if (Date.now() > deadline) break;
    const candidateTray = tray.map((piece, index) =>
      targets.has(index) && piece ? createPieceInstance(randomPieceTemplate(deck)) : piece
    ) as Tray;
    if (canCompleteTrayMemo(board, candidateTray.filter((p): p is PieceInstance => p !== null), memo)) {
      return candidateTray;
    }
  }

  // No solvable random fill found for those slots; reroll the whole tray instead.
  return nextTray(board, deck);
}

// Build `count` random piece instances (from the deck) to offer as reroll replacement candidates.
export function rerollCandidates(count: number, deck: PieceTemplate[] = PIECES): PieceInstance[] {
  return Array.from({ length: count }, () => createPieceInstance(randomPieceTemplate(deck)));
}

// Every deck piece template as a fresh instance, for the "pick from the deck" reroll level.
export function deckPieceInstances(deck: PieceTemplate[] = PIECES): PieceInstance[] {
  return deck.map(createPieceInstance);
}

// Replace a single random non-empty tray slot with a new deck piece, keeping the tray solvable.
export function rerollOnePiece(board: Board, tray: Tray, deck: PieceTemplate[] = PIECES): Tray {
  const filledSlots = tray.reduce<number[]>((slots, piece, index) => {
    if (piece) slots.push(index);
    return slots;
  }, []);
  if (!filledSlots.length) return tray;

  const slotIndex = filledSlots[Math.floor(Math.random() * filledSlots.length)];
  const withCandidate = (template: PieceTemplate): Tray =>
    tray.map((piece, index) => (index === slotIndex ? createPieceInstance(template) : piece)) as Tray;

  const memo = new Map<string, boolean>();
  const deadline = Date.now() + TRAY_BUDGET_MS;

  for (let attempt = 0; attempt < RANDOM_TRAY_ATTEMPTS; attempt += 1) {
    if (Date.now() > deadline) break;
    const candidateTray = withCandidate(randomPieceTemplate(deck));
    if (canCompleteTrayMemo(board, candidateTray.filter((p): p is PieceInstance => p !== null), memo)) {
      return candidateTray;
    }
  }

  // Exhaustively look for any deck template that keeps the tray completable.
  const exhaustiveDeadline = Date.now() + TRAY_BUDGET_MS;
  for (const template of deck) {
    if (Date.now() > exhaustiveDeadline) break;
    const candidateTray = withCandidate(template);
    if (canCompleteTrayMemo(board, candidateTray.filter((p): p is PieceInstance => p !== null), memo)) {
      return candidateTray;
    }
  }

  // No single swap keeps it solvable; fall back to a fresh full tray.
  return nextTray(board, deck);
}

// Pick a template, biased toward smaller pieces when `bias` > 0 (combo-correction augment).
// bias is 0..1; higher means small pieces are much more likely.
function pickBiasedTemplate(deck: PieceTemplate[], bias: number): PieceTemplate {
  if (bias <= 0) return randomPieceTemplate(deck);
  const weights = deck.map((piece) => 1 / Math.pow(piece.cells.length, bias * 2));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < deck.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return deck[i];
  }
  return deck[deck.length - 1];
}

export function nextTray(board: Board | null, deck: PieceTemplate[] = PIECES, bias = 0): Tray {
  if (!board) return Array.from({ length: TRAY_SIZE }, () => randomPiece(deck)) as Tray;

  // Share one memo across all attempts to avoid recomputing subproblems.
  const memo = new Map<string, boolean>();
  const deadline = Date.now() + TRAY_BUDGET_MS;

  for (let attempt = 0; attempt < RANDOM_TRAY_ATTEMPTS; attempt += 1) {
    if (Date.now() > deadline) break;
    const tray = Array.from({ length: TRAY_SIZE }, () => pickBiasedTemplate(deck, bias));
    if (canCompleteTrayMemo(board, tray, memo)) {
      return tray.map(createPieceInstance) as Tray;
    }
  }

  const exhaustiveDeadline = Date.now() + TRAY_BUDGET_MS;
  const fallback = findSolvableTray(board, memo, deck, exhaustiveDeadline);
  if (fallback) return fallback.map(createPieceInstance) as Tray;

  // Time budget exceeded on very full boards; return random pieces.
  // The game will trigger game-over naturally if none can be placed.
  return Array.from({ length: TRAY_SIZE }, () => randomPiece(deck)) as Tray;
}
