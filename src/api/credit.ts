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
  const apiUrl = `${baseUrl.replace(/\/+$/, "")}${CREDIT_API_PATH}`;

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

  return {
    async getBalance(): Promise<{ coin: number }> {
      const data = await request("/balances/me", { method: "GET" });
      if (!isRecord(data) || !isCoinAmount(data.coin)) {
        throw new CreditApiError("CREDIT_INVALID_RESPONSE", 200, true);
      }
      return { coin: data.coin };
    },

    async claimGameReward(gameId: string): Promise<GameReward> {
      if (!gameId.trim())
        throw new CreditApiError("INVALID_REQUEST_BODY", 0, false);

      const data = await request("/game-rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });
      if (!isGameReward(data, gameId)) {
        throw new CreditApiError("CREDIT_INVALID_RESPONSE", 200, true);
      }
      return data;
    },
  };
}
