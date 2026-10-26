import { CreditApiError, isGameReward, type GameReward } from "../api/credit";

export type GameRewardState =
  | { status: "idle" | "pending" | "ineligible" }
  | { status: "success"; reward: GameReward }
  | { status: "error"; message: string; retryable: boolean };

export interface RewardGame {
  gameId: string;
  mode: "normal" | "hard";
}

type SettleGameReward = (gameId: string) => Promise<GameReward>;

const DEFAULT_ERROR_MESSAGE =
  "정산 결과를 확인하지 못했습니다. 같은 게임의 정산 결과를 다시 확인해 주세요.";
const ERROR_MESSAGES: Record<string, string> = {
  ACCESS_DENIED: "코인 보상 기능을 사용할 권한이 없습니다.",
  CREDIT_GAME_NOT_ELIGIBLE: "일반 게임은 코인 보상 대상이 아닙니다.",
  CREDIT_GAME_NOT_FOUND: "게임 기록을 찾을 수 없습니다.",
  CREDIT_GAME_NOT_FINISHED: "게임 종료 기록이 아직 확인되지 않았습니다.",
  CREDIT_GAME_RESULT_NOT_VERIFIED: "게임 결과 검증이 아직 완료되지 않았습니다.",
};

function getErrorMessage(error: CreditApiError): string {
  if (error.status === 401) {
    return "로그인이 만료되었습니다. 다시 로그인한 후 보상을 확인해 주세요.";
  }
  if (error.code === "ACCESS_DENIED") return ERROR_MESSAGES.ACCESS_DENIED;
  if (error.status === 403) return "이 게임의 보상을 받을 권한이 없습니다.";
  return ERROR_MESSAGES[error.code] ?? DEFAULT_ERROR_MESSAGE;
}

function canClaimReward(state: GameRewardState): boolean {
  return (
    state.status === "idle" || (state.status === "error" && state.retryable)
  );
}

/** 인증된 서버 게임별로 생성한다. 계정·게임 간 재사용하거나 로컬 ID로 만들지 않는다.
 * 새로고침·여러 기기의 중복 지급 방지는 서버 저장소의 책임이다.
 */
export function createGameRewardSession(
  { gameId, mode }: RewardGame,
  settle: SettleGameReward,
) {
  if (!gameId.trim())
    throw new CreditApiError("INVALID_REQUEST_BODY", 0, false);
  if (mode !== "normal" && mode !== "hard") {
    throw new CreditApiError("CREDIT_INVALID_GAME_MODE", 0, false);
  }

  let state: GameRewardState = {
    status: mode === "hard" ? "idle" : "ineligible",
  };
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  function publish(next: GameRewardState) {
    state = next;
    listeners.forEach((listener) => listener());
  }

  function complete(reward: GameReward) {
    if (!isGameReward(reward, gameId)) {
      throw new CreditApiError("CREDIT_INVALID_RESPONSE", 0, true);
    }
    publish({ status: "success", reward });
  }

  function fail(error: unknown) {
    const failure =
      error instanceof CreditApiError
        ? error
        : new CreditApiError("CREDIT_NETWORK_ERROR", 0, true);
    publish({
      status: "error",
      message: getErrorMessage(failure),
      retryable: failure.retryable,
    });
  }

  function claim(): Promise<void> {
    if (pending) return pending;
    if (!canClaimReward(state)) return Promise.resolve();

    // 동기 예외도 처리하고 연속 호출이 같은 요청을 공유하도록 지연 실행한다.
    pending = Promise.resolve()
      .then(() => settle(gameId))
      .then(complete)
      .catch(fail)
      .finally(() => {
        pending = null;
      });
    publish({ status: "pending" });
    return pending;
  }

  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    claim,
  };
}

export type GameRewardSession = ReturnType<typeof createGameRewardSession>;
