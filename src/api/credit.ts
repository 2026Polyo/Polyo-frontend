import { AUTH_TOKEN_KEY, notifyAuthExpired } from "./auth";
import type { ThemePage } from "../features/shop";

export interface ShopAccount {
  coin: number;
  ownedThemeIds: string[];
  equippedThemeId: string;
}

export interface HardGame {
  gameId: string;
  tray: (string | null)[];
  score: number;
  moveNumber: number;
  remainingMs: number;
  turnLimitMs: number;
  finished: boolean;
}

export interface HardMove {
  moveNumber: number;
  slot: number;
  row: number;
  col: number;
}

export interface GameReward {
  rewardId: string;
  gameId: string;
  earnedCoin: number;
  /** 정산 당시 잔액. 현재 잔액은 별도 조회한다. */
  coinAfterReward: number;
}

export class CreditApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(code);
    this.name = "CreditApiError";
  }
}

interface CreditApiOptions {
  baseUrl: string;
  /** 인증 팀이 제공할 전송 함수. 임의의 사용자 헤더나 토큰 저장은 하지 않는다. */
  fetcher: typeof fetch;
  timeoutMs?: number;
}

const CREDIT_API_PATH = "/api/credit/v11";
const SHOP_API_PATH = "/api/shop/v11";
const DEFAULT_TIMEOUT_MS = 10_000;
const PENDING_GAME_ERRORS = new Set([
  "CREDIT_GAME_RESULT_NOT_VERIFIED",
  "CREDIT_GAME_NOT_FINISHED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isCoinAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isShopAccount(value: unknown): value is ShopAccount {
  return isRecord(value) && isCoinAmount(value.coin)
    && Array.isArray(value.ownedThemeIds) && value.ownedThemeIds.every(isId)
    && isId(value.equippedThemeId);
}

function isThemePage(value: unknown): value is ThemePage {
  return isRecord(value) && Array.isArray(value.items)
    && value.items.every(theme => isRecord(theme) && isId(theme.themeId)
      && isId(theme.name) && isCoinAmount(theme.price))
    && isCoinAmount(value.page) && value.page > 0 && isCoinAmount(value.size) && value.size > 0
    && isCoinAmount(value.totalElements) && isCoinAmount(value.totalPages);
}

function isHardGame(value: unknown): value is HardGame {
  return isRecord(value) && isId(value.gameId) && Array.isArray(value.tray)
    && value.tray.length === 3 && value.tray.every(piece => piece === null || isId(piece))
    && isCoinAmount(value.score) && isCoinAmount(value.moveNumber)
    && isCoinAmount(value.remainingMs) && isCoinAmount(value.turnLimitMs)
    && value.remainingMs <= value.turnLimitMs && typeof value.finished === "boolean";
}

export function isGameReward(
  value: unknown,
  gameId: string,
): value is GameReward {
  if (!isRecord(value)) return false;

  const hasRewardId =
    typeof value.rewardId === "string" && value.rewardId.trim().length > 0;
  return (
    hasRewardId &&
    value.gameId === gameId &&
    isCoinAmount(value.earnedCoin) &&
    isCoinAmount(value.coinAfterReward)
  );
}

function responseError(body: unknown, response: Response): CreditApiError {
  if (response.status === 401) notifyAuthExpired();
  const fallbackCode =
    response.status === 401
      ? "AUTH_UNAUTHORIZED"
      : response.status === 403
        ? "ACCESS_DENIED"
        : "CREDIT_INVALID_RESPONSE";
  const code =
    isRecord(body) &&
    isRecord(body.error) &&
    typeof body.error.code === "string"
      ? body.error.code
      : fallbackCode;
  const authenticationFailed =
    response.status === 401 || response.status === 403;
  const retryable =
    !authenticationFailed &&
    (response.status >= 500 ||
      response.status === 408 ||
      response.status === 429 ||
      response.ok ||
      PENDING_GAME_ERRORS.has(code));

  return new CreditApiError(code, response.status, retryable);
}

async function readResponseData(response: Response): Promise<unknown> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw responseError(null, response);
  }

  if (!response.ok || !isRecord(body) || body.success !== true) {
    throw responseError(body, response);
  }
  if (response.status !== 200 && response.status !== 201) {
    throw new CreditApiError("CREDIT_INVALID_RESPONSE", response.status, true);
  }
  return body.data;
}

export function createCreditApi({
  baseUrl,
  fetcher,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: CreditApiOptions) {
  if (!baseUrl.trim() || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new CreditApiError("CREDIT_INVALID_CONFIGURATION", 0, false);
  }
  const apiUrl = baseUrl.replace(/\/+$/, "");

  async function fetchData(
    path: string,
    init: RequestInit,
    signal: AbortSignal,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await fetcher(`${apiUrl}${path}`, { ...init, signal });
    } catch {
      throw new CreditApiError("CREDIT_NETWORK_ERROR", 0, true);
    }
    return readResponseData(response);
  }

  async function request(path: string, init: RequestInit): Promise<unknown> {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new CreditApiError("CREDIT_REQUEST_TIMEOUT", 0, true));
      }, timeoutMs);
    });

    try {
      // 본문 수신까지 포함하여 요청 전체에 제한 시간을 적용한다.
      return await Promise.race([
        fetchData(path, init, controller.signal),
        timeout,
      ]);
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
  }

  async function checked<T>(
    path: string,
    init: RequestInit,
    isValid: (data: unknown) => data is T,
  ): Promise<T> {
    const data = await request(path, init);
    if (!isValid(data)) throw new CreditApiError("CREDIT_INVALID_RESPONSE", 200, true);
    return data;
  }

  function json(method: "POST" | "PUT", body: object): RequestInit {
    return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  }

  function hardGameRequest(path: string, init: RequestInit, gameId?: string) {
    return checked(`${CREDIT_API_PATH}/hard-games${path}`, init,
      (data): data is HardGame => isHardGame(data) && (gameId === undefined || data.gameId === gameId));
  }

  return {
    async getBalance(): Promise<{ coin: number }> {
      const data = await request(`${CREDIT_API_PATH}/balances/me`, { method: "GET" });
      if (!isRecord(data) || !isCoinAmount(data.coin)) {
        throw new CreditApiError("CREDIT_INVALID_RESPONSE", 200, true);
      }
      return { coin: data.coin };
    },

    async claimGameReward(gameId: string): Promise<GameReward> {
      if (!gameId.trim())
        throw new CreditApiError("INVALID_REQUEST_BODY", 0, false);

      const data = await request(`${CREDIT_API_PATH}/game-rewards`, json("POST", { gameId }));
      if (!isGameReward(data, gameId)) {
        throw new CreditApiError("CREDIT_INVALID_RESPONSE", 200, true);
      }
      return data;
    },

    startHardGame: () => hardGameRequest("", { method: "POST" }),
    placeHardPiece: (gameId: string, move: HardMove) =>
      hardGameRequest(`/${encodeURIComponent(gameId)}/moves`, json("POST", move), gameId),
    setHardGamePaused: (gameId: string, paused: boolean) =>
      hardGameRequest(`/${encodeURIComponent(gameId)}/timer`, json("PUT", { paused }), gameId),
    finishHardGame: (gameId: string) =>
      hardGameRequest(`/${encodeURIComponent(gameId)}/completion`, { method: "PUT" }, gameId),

    getShopThemes: (page: number, sort: string) => {
      const params = new URLSearchParams({ page: String(page), sort, size: "6" });
      return checked(`${SHOP_API_PATH}/themes?${params}`, { method: "GET" }, isThemePage);
    },
    getShopAccount: () => checked(`${SHOP_API_PATH}/accounts/me`, { method: "GET" }, isShopAccount),
    grantLocalCoins: () => checked(`${SHOP_API_PATH}/local-coin-grants`, { method: "POST" }, isShopAccount),
    purchaseTheme: (themeId: string) =>
      checked(`${SHOP_API_PATH}/purchases`, json("POST", { themeId }), isShopAccount),
    equipTheme: (themeId: string) =>
      checked(`${SHOP_API_PATH}/equipment/me`, json("PUT", { themeId }), isShopAccount),
  };
}

export const creditApi = createCreditApi({
  baseUrl: import.meta.env.VITE_API_BASE_URL?.trim() || "/",
  fetcher: async (input, init) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return new Response(null, { status: 401 });
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(input, { ...init, headers });
    // A late reply for a signed-out session must not clear a newer session.
    if (token !== localStorage.getItem(AUTH_TOKEN_KEY)) throw new Error("Authentication changed");
    return response;
  },
});
