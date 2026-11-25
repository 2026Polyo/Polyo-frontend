import { PIECES, PIECE_COLORS } from "../mocks/gameData";
import { SPECIAL_LABELS } from "../mocks/specials";
import type { PieceInstance, PieceTemplate } from "../types";

function randomPieceColor(): string {
  return PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)];
}

function generateUid(): string {
  // crypto.randomUUID is only available in secure contexts (HTTPS/localhost);
  // fall back to a random string so plain-HTTP deployments don't crash.
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `piece-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createPieceInstance(piece: PieceTemplate): PieceInstance {
  return {
    ...piece,
    color: piece.color ?? randomPieceColor(),
    cells: piece.cells.map(([row, col]) => [row, col]),
    uid: generateUid(),
  };
}

export function randomPieceTemplate(
  deck: PieceTemplate[] = PIECES,
): PieceTemplate {
  return deck[Math.floor(Math.random() * deck.length)];
}

export function randomPiece(deck: PieceTemplate[] = PIECES): PieceInstance {
  return createPieceInstance(randomPieceTemplate(deck));
}

export function pieceBounds(piece: PieceTemplate): {
  rows: number;
  cols: number;
} {
  return piece.cells.reduce(
    (box, [r, c]) => ({
      rows: Math.max(box.rows, r + 1),
      cols: Math.max(box.cols, c + 1),
    }),
    { rows: 0, cols: 0 },
  );
}

export function blockName(piece: PieceTemplate): string {
  const bounds = pieceBounds(piece);
  const shapeName = piece.id
    .replace(
      /^tetromino-([ljzst])-/,
      (_, shape: string) => `${shape.toUpperCase()}자 `,
    )
    .replace(/^square-/, "정사각형 ")
    .replace(/^rectangle-/, "직사각형 ")
    .replace(/^corner-/, "모서리 ")
    .replace(/^line-(\d)-/, "$1칸 직선 ")
    .replace(/^diagonal-(\d)-/, "$1칸 대각선 ")
    .replace(/^domino-/, "2칸 직선 ")
    .replace("monomino-single", "한 칸")
    .replace(/horizontal/g, "가로")
    .replace(/vertical/g, "세로")
    .replace(/bottom/g, "아래")
    .replace(/top/g, "위")
    .replace(/down/g, "아래")
    .replace(/up/g, "위")
    .replace(/left/g, "왼쪽")
    .replace(/right/g, "오른쪽")
    .replace(/deg/g, "도")
    .replace(/-/g, " ");
  return piece.special
    ? `${SPECIAL_LABELS[piece.special]}, ${bounds.cols}열 ${bounds.rows}행 ${piece.cells.length}칸`
    : `기본 블록 ${shapeName}`;
}
