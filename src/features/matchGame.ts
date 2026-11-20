import { SIZE } from "../constants/gameData";
import type { Board, PieceInstance, SpecialPieceGroups } from "../types";
import { cloneBoard } from "../utils/boardUtils";
import { canPlace, getPlacementPreview } from "../utils/placement";
import { createBoardFeedback } from "./themes/boardFeedback";
import type { BoardFeedback } from "./themes/boardFeedback";
import { normalizeSpecialPieceGroups, placeSpecialPieceGroups } from "./themes/specialAppearance";
import { isEmoteId } from "./matchLobby";
import { getGameTheme } from "./themes/gameThemes";
import type { GameThemeId } from "./themes/gameThemes";
import type { EmoteId } from "./matchLobby";

export type FinishReason = "NO_MOVES" | "TIMEOUT" | "FORFEIT";
export type RoomClosedReason = "ROOM_DELETED" | "LEFT_ROOM";

export const ROOM_CLOSED_MESSAGES: Record<RoomClosedReason, string> = {
  ROOM_DELETED: "방장이 방을 나가서 방이 사라졌어요.",
  LEFT_ROOM: "방에서 나왔어요."
};

export interface MatchPlayerState {
  userId: string;
  nickname: string;
  board: Board;
  score: number;
  combo: number;
  turnLimitMs: number;
  connected: boolean;
  /** The theme the player had equipped when the game started; absent on older servers. */
  themeId?: string;
}

/** The theme a player's board is drawn in on every screen; unknown or missing themes fall back to classic. */
export function getPlayerThemeId(player: Pick<MatchPlayerState, "themeId">): GameThemeId {
  return getGameTheme(player.themeId).id;
}

/** What the server gave the winner of a finished game: the trophies gained and the total after it. */
export interface MatchTrophyReward {
  userId: string;
  gained: number;
  trophy: number;
}

/** Trophies the server confirmed for one finished game. */
export interface TrophyResult {
  delta: number;
  trophyCount: number;
}

export interface MatchLastMove {
  userId: string;
  scoreGain: number;
  cleared: number;
  clearingCells: string[];
}

export interface MatchGameState {
  status: "PLAYING" | "FINISHED";
  turnUserId: string;
  turnRemainingMs: number;
  players: MatchPlayerState[];
  tray: (PieceInstance | null)[];
  winnerUserId: string | null;
  finishReason: FinishReason | null;
  lastMove: MatchLastMove | null;
  /** Set only on a FINISHED state whose winner's trophies were saved; null (or absent on older servers) otherwise. */
  trophyReward?: MatchTrophyReward | null;
}

/** What a player is holding and where it would land; relayed to the rival as-is. */
export interface MatchCursor {
  /** null when nothing is held. */
  pieceUid: string | null;
  /** Placement position like PLACE's row/col; both null while off the board or on an invalid spot. */
  row: number | null;
  col: number | null;
}

export const EMPTY_CURSOR: MatchCursor = { pieceUid: null, row: null, col: null };

export type MatchServerMessage =
  | ({ type: "STATE" } & MatchGameState)
  // readyUserIds and members are optional: servers without the ready step leave them out.
  | { type: "WAITING"; connectedUserIds: string[]; readyUserIds?: string[]; members?: { userId: string; nickname: string }[] }
  | { type: "EMOTE"; userId: string; emote: EmoteId }
  // The current player's held block, relayed to the rival only.
  | ({ type: "CURSOR"; userId: string } & MatchCursor)
  // Sent just before the server closes the socket: the host left or deleted the room, or I left it.
  | { type: "ROOM_CLOSED"; reason: RoomClosedReason }
  | { type: "ERROR"; code: string; message: string };

export const FINISH_REASON_LABELS: Record<FinishReason, string> = {
  NO_MOVES: "놓을 수 있는 블록이 없어 게임이 끝났어요.",
  TIMEOUT: "시간이 초과되어 게임이 끝났어요.",
  FORFEIT: "기권으로 게임이 끝났어요."
};

// Error codes after which reconnecting cannot help.
export const FATAL_ERROR_CODES = new Set(["UNAUTHENTICATED", "ROOM_NOT_FOUND", "ROOM_MEMBER_ONLY", "ROOM_CLOSED"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlayer(value: unknown): boolean {
  return isRecord(value) && typeof value.userId === "string" && typeof value.nickname === "string"
    && Array.isArray(value.board) && typeof value.score === "number" && typeof value.turnLimitMs === "number";
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isMember(value: unknown): boolean {
  return isRecord(value) && typeof value.userId === "string" && typeof value.nickname === "string";
}

function isCursorPosition(value: unknown): boolean {
  return value === null || (Number.isInteger(value) && (value as number) >= -SIZE && (value as number) < SIZE);
}

function isTraySlot(value: unknown): boolean {
  return value === null || (isRecord(value) && typeof value.uid === "string"
    && typeof value.color === "string" && Array.isArray(value.cells));
}

export function parseServerMessage(raw: string): MatchServerMessage | null {
  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(message)) return null;
  if (message.type === "WAITING" && isStringList(message.connectedUserIds)
    && (message.readyUserIds === undefined || isStringList(message.readyUserIds))
    && (message.members === undefined || (Array.isArray(message.members) && message.members.every(isMember)))) {
    return message as unknown as MatchServerMessage;
  }
  if (message.type === "ROOM_CLOSED" && (message.reason === "ROOM_DELETED" || message.reason === "LEFT_ROOM")) {
    return message as unknown as MatchServerMessage;
  }
  if (message.type === "EMOTE" && typeof message.userId === "string" && isEmoteId(message.emote)) {
    return message as unknown as MatchServerMessage;
  }
  if (message.type === "CURSOR" && typeof message.userId === "string"
    && (message.pieceUid === null || typeof message.pieceUid === "string")
    && isCursorPosition(message.row) && isCursorPosition(message.col)
    && (message.row === null) === (message.col === null)) {
    return message as unknown as MatchServerMessage;
  }
  if (message.type === "ERROR" && typeof message.code === "string" && typeof message.message === "string") {
    return message as unknown as MatchServerMessage;
  }
  if (message.type === "STATE" && Array.isArray(message.players) && message.players.length === 2
    && message.players.every(isPlayer) && Array.isArray(message.tray) && message.tray.every(isTraySlot)
    && typeof message.turnUserId === "string" && typeof message.turnRemainingMs === "number") {
    return message as unknown as MatchServerMessage;
  }
  return null;
}

/**
 * The game to keep showing once a WAITING arrives, which means no game is running. One still shown as
 * PLAYING ended while this socket was away, so it is dropped; a finished result stays up until the
 * player goes back to the waiting room, because the server keeps the room after a game.
 */
export function gameAfterWaiting(game: MatchGameState | null): MatchGameState | null {
  return game?.status === "PLAYING" ? null : game;
}

/**
 * The trophies a finished game gave this player, or null when there is nothing to show: the game is
 * still running, the reward is someone else's (only the winner gets one; a loss costs nothing), the
 * server could not save it or does not send it, or its values are not sane.
 * The server awards once per game; the client only shows what it was told and never adds on its own.
 */
export function getTrophyResult(game: MatchGameState | null, userId: string): TrophyResult | null {
  if (game?.status !== "FINISHED") return null;
  const reward: unknown = game.trophyReward;
  if (!isRecord(reward) || reward.userId !== userId) return null;
  const { gained, trophy } = reward;
  if (typeof gained !== "number" || typeof trophy !== "number") return null;
  if (!Number.isSafeInteger(gained) || !Number.isSafeInteger(trophy)) return null;
  if (gained <= 0 || trophy < gained) return null;
  return { delta: gained, trophyCount: trophy };
}

export function getMatchSocketUrl(baseUrl: string, roomId: number, location: { protocol: string; host: string }): string {
  const origin = baseUrl ? baseUrl.replace(/\/$/, "") : `${location.protocol}//${location.host}`;
  return `${origin.replace(/^http/, "ws")}/ws/match/${roomId}`;
}

export function sameCursor(a: MatchCursor, b: MatchCursor): boolean {
  return a.pieceUid === b.pieceUid && a.row === b.row && a.col === b.col;
}

export interface CursorPreview {
  piece: PieceInstance;
  /** Board cells the held piece would cover, as "row-col"; empty while it is off the board. */
  cells: Set<string>;
}

/** The rival's held piece from the shared tray, or null when it is not (or no longer) there. */
export function getCursorPreview(cursor: MatchCursor | null, tray: readonly (PieceInstance | null)[]): CursorPreview | null {
  if (!cursor?.pieceUid) return null;
  const piece = tray.find((slot) => slot?.uid === cursor.pieceUid);
  if (!piece) return null;
  const cells = new Set<string>();
  if (cursor.row !== null && cursor.col !== null) {
    for (const [dr, dc] of piece.cells) {
      const row = cursor.row + dr;
      const col = cursor.col + dc;
      if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) cells.add(`${row}-${col}`);
    }
  }
  return { piece, cells };
}

export interface MatchMoveFeedback {
  /** The player whose board the move landed on. */
  userId: string;
  /** The placed piece's color, for the theme's placement sound. */
  color: string;
  feedback: BoardFeedback;
  /** The placement itself, for keeping which cells came from which piece. */
  piece: PieceInstance;
  row: number;
  col: number;
  /** The mover's board before the move, and with the piece landed but nothing cleared yet. */
  before: Board;
  displayBoard: Board;
}

/**
 * Rebuilds the placement behind next.lastMove from two consecutive states, so a match move gets the same
 * theme effects and sounds as a solo one. The server sends no piece or position, so the piece is the one
 * that left the shared tray and the position is the one whose landing matches the mover's new board.
 * Returns null when that cannot be told for sure (e.g. states were missed while reconnecting).
 */
export function getMatchMoveFeedback(id: number, previous: MatchGameState, next: MatchGameState): MatchMoveFeedback | null {
  const move = next.lastMove;
  if (!move) return null;
  const before = previous.players.find((player) => player.userId === move.userId)?.board;
  const after = next.players.find((player) => player.userId === move.userId)?.board;
  if (!before || !after) return null;
  const nextUids = new Set(next.tray.flatMap((slot) => (slot ? [slot.uid] : [])));
  const used = previous.tray.filter((slot): slot is PieceInstance => slot !== null && !nextUids.has(slot.uid));
  if (used.length !== 1) return null;
  const piece = used[0];
  const clearing = new Set(move.clearingCells);
  const newlyFilled: string[] = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (!before[row]?.[col] && after[row]?.[col]) newlyFilled.push(`${row}-${col}`);
    }
  }
  for (let row = -SIZE; row < SIZE; row += 1) {
    for (let col = -SIZE; col < SIZE; col += 1) {
      if (!canPlace(before, piece, row, col)) continue;
      const { cells } = getPlacementPreview(before, piece, row, col);
      const landed = [...cells].every((key) => clearing.has(key) || isFilled(after, key));
      if (!landed || !newlyFilled.every((key) => cells.has(key))) continue;
      const displayBoard = cloneBoard(before);
      cells.forEach((key) => {
        const [r, c] = key.split("-").map(Number);
        displayBoard[r][c] = piece.color;
      });
      return {
        userId: move.userId, color: piece.color,
        feedback: createBoardFeedback(id, piece, row, col, displayBoard, clearing, move.cleared),
        piece, row, col, before, displayBoard
      };
    }
  }
  return null;
}

function isFilled(board: Board, key: string): boolean {
  const [row, col] = key.split("-").map(Number);
  return Boolean(board[row]?.[col]);
}

/**
 * Which special cells came from the same piece on a player's board after a move, as solo play keeps it,
 * so the cat theme joins a special piece's cells into one cat. Without a known placement the new special
 * cells stay apart rather than merge with unrelated ones.
 */
export function getMatchSpecialPieceGroups(
  previous: SpecialPieceGroups,
  board: Board,
  move: MatchMoveFeedback | null,
): SpecialPieceGroups {
  if (!move) return normalizeSpecialPieceGroups(board, previous);
  const placed = placeSpecialPieceGroups(move.before, previous, move.piece, move.row, move.col, move.displayBoard);
  return normalizeSpecialPieceGroups(board, placed);
}
