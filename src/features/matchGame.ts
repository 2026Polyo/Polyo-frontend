import type { Board, PieceInstance } from "../types";
import { isEmoteId } from "./matchLobby";
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
}

export type MatchServerMessage =
  | ({ type: "STATE" } & MatchGameState)
  // readyUserIds and members are optional: servers without the ready step leave them out.
  | { type: "WAITING"; connectedUserIds: string[]; readyUserIds?: string[]; members?: { userId: string; nickname: string }[] }
  | { type: "EMOTE"; userId: string; emote: EmoteId }
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

export function getMatchSocketUrl(baseUrl: string, roomId: number, location: { protocol: string; host: string }): string {
  const origin = baseUrl ? baseUrl.replace(/\/$/, "") : `${location.protocol}//${location.host}`;
  return `${origin.replace(/^http/, "ws")}/ws/match/${roomId}`;
}
