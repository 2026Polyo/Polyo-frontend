import type { PieceTemplate } from "../types";

export const SIZE = 8;

export const EMPTY_BOARD: (string | null)[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));

interface CatalogPieceTemplate extends PieceTemplate {
  legacyIds?: string[];
}

// Standard shapes. IDs are descriptive because they are persisted in deck/loadout saves.
const BASE_PIECES: CatalogPieceTemplate[] = [
  {
    id: "square-3x3",
    legacyIds: ["big-square"],
    cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]
  },
  { id: "rectangle-2x3", legacyIds: ["2x3"], cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]] },
  { id: "rectangle-3x2", legacyIds: ["3x2"], cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]] },
  { id: "square-2x2", legacyIds: ["square"], cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: "corner-bottom-left", legacyIds: ["V0"], cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
  { id: "corner-top-left", legacyIds: ["V90"], cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]] },
  { id: "corner-top-right", legacyIds: ["V180"], cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]] },
  { id: "corner-bottom-right", legacyIds: ["V270"], cells: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]] },
  { id: "line-5-horizontal", legacyIds: ["five-h"], cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: "line-5-vertical", legacyIds: ["five-v"], cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
  { id: "line-4-horizontal", legacyIds: ["quad-h"], cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: "line-4-vertical", legacyIds: ["quad-v"], cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { id: "tetromino-l-0deg", legacyIds: ["L0"], cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { id: "tetromino-l-90deg", legacyIds: ["L90"], cells: [[0, 0], [0, 1], [0, 2], [1, 0]] },
  { id: "tetromino-l-180deg", legacyIds: ["L180"], cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { id: "tetromino-l-270deg", legacyIds: ["L270"], cells: [[0, 2], [1, 0], [1, 1], [1, 2]] },
  { id: "tetromino-j-0deg", legacyIds: ["J0"], cells: [[0, 1], [1, 1], [2, 0], [2, 1]] },
  { id: "tetromino-j-90deg", legacyIds: ["J90"], cells: [[0, 0], [1, 0], [1, 1], [1, 2]] },
  { id: "tetromino-j-180deg", legacyIds: ["J180"], cells: [[0, 0], [0, 1], [1, 0], [2, 0]] },
  { id: "tetromino-j-270deg", legacyIds: ["J270"], cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
  { id: "tetromino-z-horizontal", legacyIds: ["Z0"], cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  { id: "tetromino-z-vertical", legacyIds: ["Z90"], cells: [[0, 1], [1, 0], [1, 1], [2, 0]] },
  { id: "tetromino-s-horizontal", legacyIds: ["S0"], cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
  { id: "tetromino-s-vertical", legacyIds: ["S90"], cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { id: "tetromino-t-down", legacyIds: ["T0"], cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: "tetromino-t-right", legacyIds: ["T90"], cells: [[0, 0], [1, 0], [1, 1], [2, 0]] },
  { id: "tetromino-t-up", legacyIds: ["T180"], cells: [[0, 1], [1, 0], [1, 1], [1, 2]] },
  { id: "tetromino-t-left", legacyIds: ["T270"], cells: [[0, 1], [1, 0], [1, 1], [2, 1]] },
  { id: "monomino-single", legacyIds: ["single"], cells: [[0, 0]] },
  { id: "domino-horizontal", legacyIds: ["duo-h"], cells: [[0, 0], [0, 1]] },
  { id: "domino-vertical", legacyIds: ["duo-v"], cells: [[0, 0], [1, 0]] }
];

// Unusual extra shapes. They are unlocked through play before they can be used in a deck.
const EXTRA_PIECES: CatalogPieceTemplate[] = [
  { id: "diagonal-2-down-right", legacyIds: ["diag-2"], cells: [[0, 0], [1, 1]] },
  { id: "diagonal-2-down-left", legacyIds: ["anti-diag-2"], cells: [[0, 1], [1, 0]] },
  { id: "diagonal-3-down-right", legacyIds: ["diag-3"], cells: [[0, 0], [1, 1], [2, 2]] },
  { id: "diagonal-3-down-left", legacyIds: ["anti-diag-3"], cells: [[0, 2], [1, 1], [2, 0]] },
  { id: "diagonal-4-down-right", legacyIds: ["diag-4"], cells: [[0, 0], [1, 1], [2, 2], [3, 3]] },
  { id: "rectangle-3x4", legacyIds: ["big-3x4"], cells: [
    [0, 0], [0, 1], [0, 2], [0, 3],
    [1, 0], [1, 1], [1, 2], [1, 3],
    [2, 0], [2, 1], [2, 2], [2, 3]
  ] },
  { id: "rectangle-4x3", legacyIds: ["big-4x3"], cells: [
    [0, 0], [0, 1], [0, 2],
    [1, 0], [1, 1], [1, 2],
    [2, 0], [2, 1], [2, 2],
    [3, 0], [3, 1], [3, 2]
  ] },
  { id: "square-4x4", legacyIds: ["big-4x4"], cells: [
    [0, 0], [0, 1], [0, 2], [0, 3],
    [1, 0], [1, 1], [1, 2], [1, 3],
    [2, 0], [2, 1], [2, 2], [2, 3],
    [3, 0], [3, 1], [3, 2], [3, 3]
  ] }
];

const CATALOG_PIECES: CatalogPieceTemplate[] = [...BASE_PIECES, ...EXTRA_PIECES];

// Full catalog: standard pieces plus the opt-in extras.
export const PIECES: PieceTemplate[] = CATALOG_PIECES.map(({ legacyIds: _legacyIds, ...piece }) => piece);

export const DEFAULT_DECK: string[] = [
  "square-2x2",
  "line-4-horizontal", "line-4-vertical",
  "tetromino-l-0deg", "tetromino-l-90deg", "tetromino-l-180deg", "tetromino-l-270deg",
  "tetromino-j-0deg", "tetromino-j-90deg", "tetromino-j-180deg", "tetromino-j-270deg",
  "tetromino-z-horizontal", "tetromino-z-vertical",
  "tetromino-s-horizontal", "tetromino-s-vertical",
  "tetromino-t-down", "tetromino-t-right", "tetromino-t-up", "tetromino-t-left"
];

const DEFAULT_DECK_SET = new Set(DEFAULT_DECK);

export const LOCKABLE_BLOCK_IDS: string[] = PIECES
  .map((piece) => piece.id)
  .filter((id) => !DEFAULT_DECK_SET.has(id));

const PIECE_BY_ID = new Map<string, PieceTemplate>();
const CANONICAL_ID_BY_ALIAS = new Map<string, string>();

CATALOG_PIECES.forEach(({ legacyIds = [], ...piece }) => {
  PIECE_BY_ID.set(piece.id, piece);
  CANONICAL_ID_BY_ALIAS.set(piece.id, piece.id);
  legacyIds.forEach((legacyId) => {
    PIECE_BY_ID.set(legacyId, piece);
    CANONICAL_ID_BY_ALIAS.set(legacyId, piece.id);
  });
});

export function normalizePieceId(id: string): string | undefined {
  return CANONICAL_ID_BY_ALIAS.get(id);
}

export function getPieceTemplate(id: string): PieceTemplate | undefined {
  return PIECE_BY_ID.get(id);
}

export function getDeckPieces(deckIds: unknown): PieceTemplate[] {
  if (!Array.isArray(deckIds)) return PIECES;
  const pieces = (deckIds as unknown[])
    .map((id) => (typeof id === "string" ? PIECE_BY_ID.get(id) : undefined))
    .filter((p): p is PieceTemplate => p !== undefined);
  return pieces.length ? pieces : PIECES;
}

export function isValidDeck(deckIds: unknown): deckIds is string[] {
  return Array.isArray(deckIds) && deckIds.length > 0 && deckIds.every((id) => typeof id === "string" && PIECE_BY_ID.has(id));
}

export const PIECE_COLORS: string[] = [
  "cyan", "lime", "amber", "rose", "violet", "blue", "teal", "orange", "pink", "green", "indigo"
];

export const SPECIAL_COLORS = new Set(["ghost", "line", "echo", "golden", "bomb", "fill", "boost"]);

export const colorClass: Record<string, string> = {
  cyan: "piece-cyan",
  lime: "piece-lime",
  amber: "piece-amber",
  rose: "piece-rose",
  violet: "piece-violet",
  blue: "piece-blue",
  teal: "piece-teal",
  orange: "piece-orange",
  pink: "piece-pink",
  green: "piece-green",
  indigo: "piece-indigo",
  ghost: "piece-ghost",
  line: "piece-line",
  echo: "piece-echo",
  golden: "piece-golden",
  bomb: "piece-bomb",
  fill: "piece-fill",
  boost: "piece-boost"
};
