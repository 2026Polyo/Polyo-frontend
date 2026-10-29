export const ROOM_NAME_MIN_LENGTH = 1;
export const ROOM_NAME_MAX_LENGTH = 30;

export interface CreateRoomInput {
  roomName: string;
  isPrivate: boolean;
}

export type RoomFormValues = CreateRoomInput;
export type RoomFormErrors = Partial<Record<keyof RoomFormValues, string>>;

export interface MatchRoomDetails {
  roomId: number;
  roomName: string;
  hostUserId: string;
  isPrivate: boolean;
  entryCode: string;
  maxPlayers: 2;
  playerCount: 1 | 2;
  status: "WAITING" | "FULL" | "PLAYING";
  members: { userId: string; nickname: string }[];
  createdAt: string;
}

export interface CreatedMatchRoom extends MatchRoomDetails {
  playerCount: 1;
  status: "WAITING";
}

export interface MatchRoomSummary extends Omit<MatchRoomDetails, "entryCode" | "members" | "status"> {
  hostNickname: string;
  status: "WAITING" | "FULL";
}

export interface MatchRoomPage {
  rooms: MatchRoomSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface MatchRoomApi {
  create: CreateRoomHandler;
  list: (page: number, signal: AbortSignal) => Promise<MatchRoomPage>;
  joinById: (roomId: number, signal: AbortSignal) => Promise<MatchRoomDetails>;
  joinByCode: (entryCode: string, signal: AbortSignal) => Promise<MatchRoomDetails>;
}

export const ENTRY_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

export function normalizeEntryCode(value: string): string {
  return value.trim().toUpperCase();
}

export type CreateRoomHandler = (input: CreateRoomInput, signal: AbortSignal) => Promise<CreatedMatchRoom>;

export function getRoomNameLength(name: string): number {
  return Array.from(name).length;
}

export function createInitialRoomValues(): RoomFormValues {
  return { roomName: "", isPrivate: false };
}

export function validateRoomForm(values: RoomFormValues): RoomFormErrors {
  const errors: RoomFormErrors = {};
  const nameLength = typeof values.roomName === "string" ? getRoomNameLength(values.roomName.trim()) : 0;

  if (nameLength < ROOM_NAME_MIN_LENGTH || nameLength > ROOM_NAME_MAX_LENGTH) {
    errors.roomName = "방 이름은 1~30자로 입력해 주세요.";
  }
  if (typeof values.isPrivate !== "boolean") errors.isPrivate = "공개 설정을 선택해 주세요.";

  return errors;
}

export function toCreateRoomInput(values: RoomFormValues): CreateRoomInput {
  if (Object.keys(validateRoomForm(values)).length > 0) {
    throw new Error("방 설정을 확인해 주세요.");
  }

  return { roomName: values.roomName.trim(), isPrivate: values.isPrivate };
}
