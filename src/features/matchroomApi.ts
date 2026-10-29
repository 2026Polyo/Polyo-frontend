import { ENTRY_CODE_PATTERN, normalizeEntryCode, toCreateRoomInput, validateRoomForm } from "./matchroom";
import type { CreatedMatchRoom, CreateRoomHandler, MatchRoomApi, MatchRoomDetails, MatchRoomPage, MatchRoomSummary } from "./matchroom";

export class MatchRoomApiError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "MatchRoomApiError";
  }
}

const UNKNOWN_CREATION = "생성 결과를 확인하지 못했어요. 방이 생성됐을 수 있으니 확인 후 다시 시도해 주세요.";
const LOGIN_REQUIRED = "로그인이 필요해요. 로그인 후 다시 시도해 주세요.";
const ERROR_MESSAGES = new Map([
  ["UNAUTHENTICATED", LOGIN_REQUIRED],
  ["INTERNAL_SERVER_ERROR", "일시적인 서버 오류예요. 잠시 후 다시 시도해 주세요."],
  ["ROOM_CODE_REQUIRED", "비공개 방은 입장 코드가 필요해요. 코드로 접속해 주세요."],
  ["ROOM_NOT_FOUND", "방을 찾을 수 없어요. 입장 코드를 확인하거나 목록을 새로고침해 주세요."],
  ["ROOM_FULL", "방 정원이 가득 찼어요. 다른 방에 접속해 주세요."],
  ["MATCH_ALREADY_STARTED", "이미 게임이 시작된 방이에요. 다른 방에 접속해 주세요."]
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPositiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isUserId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonnegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isRoomBase(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  return isPositiveId(value.roomId) && isUserId(value.hostUserId)
    && typeof value.roomName === "string" && typeof value.isPrivate === "boolean"
    && Object.keys(validateRoomForm({ roomName: value.roomName, isPrivate: value.isPrivate })).length === 0
    && value.maxPlayers === 2
    && ((value.status === "WAITING" && value.playerCount === 1)
      || ((value.status === "FULL" || value.status === "PLAYING") && value.playerCount === 2))
    && typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt));
}

function isRoomDetails(value: unknown): value is MatchRoomDetails {
  return isRoomBase(value)
    && typeof value.entryCode === "string" && ENTRY_CODE_PATTERN.test(value.entryCode)
    && Array.isArray(value.members) && value.members.length === value.playerCount
    && value.members.every((member: unknown) => isRecord(member)
      && isUserId(member.userId) && typeof member.nickname === "string")
    && value.members.some((member: { userId: string }) => member.userId === value.hostUserId)
    && new Set(value.members.map((member: { userId: string }) => member.userId)).size === value.members.length;
}

function isCreatedMatchRoom(value: unknown): value is CreatedMatchRoom {
  return isRoomDetails(value) && value.status === "WAITING" && value.playerCount === 1;
}

function isRoomSummary(value: unknown): value is MatchRoomSummary {
  return isRoomBase(value) && value.status !== "PLAYING" && typeof value.hostNickname === "string";
}

function isRoomPage(value: unknown): value is MatchRoomPage {
  return isRecord(value) && Array.isArray(value.rooms) && value.rooms.every(isRoomSummary)
    && isNonnegativeInteger(value.page) && isPositiveId(value.size) && value.size <= 100
    && value.rooms.length <= value.size && isNonnegativeInteger(value.totalElements)
    && isNonnegativeInteger(value.totalPages);
}

interface RoomApiOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

type Operation = "create" | "list" | "join";

export function createMatchRoomApi({ baseUrl = "", fetcher = fetch, timeoutMs = 15000 }: RoomApiOptions = {}): MatchRoomApi {
  async function request<T>(path: string, method: "GET" | "POST", body: object | undefined,
    signal: AbortSignal, operation: Operation, validate: (value: unknown) => value is T): Promise<T> {
    signal.throwIfAborted();
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    const unknownResult = operation === "create" ? UNKNOWN_CREATION
      : operation === "list" ? "방 목록을 불러오지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요."
        : "접속 결과를 확인하지 못했어요. 같은 방이나 코드로 다시 접속해 주세요.";

    try {
      const response = await fetcher(`${baseUrl.replace(/\/$/, "")}/api/match-room${path}`, {
        method,
        credentials: "include",
        headers: body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal
      });
      const result: unknown = await response.json().catch(() => null);
      controller.signal.throwIfAborted();
      if (!response.ok) {
        const error = isRecord(result) && isRecord(result.error) ? result.error : null;
        const code = error && typeof error.code === "string" ? error.code : "UNKNOWN_ERROR";
        const invalidMessage = operation === "create" ? "방 이름과 공개 설정을 확인해 주세요."
          : operation === "join" ? "방 번호 또는 8자리 입장 코드를 확인해 주세요." : "페이지 정보를 확인해 주세요.";
        throw new MatchRoomApiError(code, code === "INVALID_REQUEST" ? invalidMessage
          : ERROR_MESSAGES.get(code) ?? (response.status === 401 ? LOGIN_REQUIRED : "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요."));
      }
      if (response.status !== (operation === "create" ? 201 : 200)
        || !isRecord(result) || result.success !== true || result.error !== null || !validate(result.data)) {
        throw new MatchRoomApiError("INVALID_RESPONSE", unknownResult);
      }
      return result.data;
    } catch (error) {
      if (signal.aborted) throw error;
      if (error instanceof MatchRoomApiError) throw error;
      throw new MatchRoomApiError(timedOut ? "TIMEOUT" : "NETWORK_ERROR", unknownResult);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    }
  }

  return {
    create: async (values, signal) => request("", "POST", toCreateRoomInput(values), signal, "create", isCreatedMatchRoom),
    list: async (page, signal) => {
      if (!isNonnegativeInteger(page)) throw new MatchRoomApiError("INVALID_REQUEST", "페이지 정보를 확인해 주세요.");
      return request(`?page=${page}&size=20`, "GET", undefined, signal, "list", isRoomPage);
    },
    joinById: async (roomId, signal) => {
      if (!isPositiveId(roomId)) throw new MatchRoomApiError("INVALID_REQUEST", "방 번호를 확인해 주세요.");
      return request(`/${roomId}/members`, "POST", undefined, signal, "join", isRoomDetails);
    },
    joinByCode: async (value, signal) => {
      const entryCode = normalizeEntryCode(value);
      if (!ENTRY_CODE_PATTERN.test(entryCode)) throw new MatchRoomApiError("INVALID_REQUEST", "입장 코드는 영문 대문자와 숫자로 된 8자리를 확인해 주세요. (I, O, 0, 1 제외)");
      return request("/code/members", "POST", { entryCode }, signal, "join", isRoomDetails);
    }
  };
}

// Keep the creation adapter available independently for existing consumers and tests.
export function createRoomApi(options: RoomApiOptions = {}): CreateRoomHandler {
  return createMatchRoomApi(options).create;
}

export const matchRoomApi = createMatchRoomApi({ baseUrl: import.meta.env.VITE_API_BASE_URL ?? "" });
export const createMatchRoom = matchRoomApi.create;
