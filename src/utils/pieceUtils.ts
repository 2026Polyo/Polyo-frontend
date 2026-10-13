import { PIECES, PIECE_COLORS } from "../constants/gameData";
import type { PieceInstance, PieceTemplate } from "../types";

function randomPieceColor(): string {
  return PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)];
}

function generateUid(): string {
  // crypto.randomUUID is only available in secure contexts (HTTPS/localhost);
  // fall back to a random string so plain-HTTP deployments don't crash.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `piece-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createPieceInstance(piece: PieceTemplate): PieceInstance {
  return {
    ...piece,
    color: piece.color ?? randomPieceColor(),
    cells: piece.cells.map(([row, col]) => [row, col]),
    uid: generateUid()
  };
}

export function randomPieceTemplate(deck: PieceTemplate[] = PIECES): PieceTemplate {
  return deck[Math.floor(Math.random() * deck.length)];
}

export function randomPiece(deck: PieceTemplate[] = PIECES): PieceInstance {
  return createPieceInstance(randomPieceTemplate(deck));
}

export function pieceBounds(piece: PieceTemplate): { rows: number; cols: number } {
  return piece.cells.reduce(
    (box, [r, c]) => ({
      rows: Math.max(box.rows, r + 1),
      cols: Math.max(box.cols, c + 1)
    }),
    { rows: 0, cols: 0 }
  );
}
