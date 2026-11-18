import { useRef, useState } from "react";
import { CreditApiError, type HardGame } from "../api/credit";

export interface HardGameRequest {
  pending: boolean;
  error?: string;
  retry?: () => void;
}

export function useHardGameRequest() {
  const [state, setState] = useState<HardGameRequest>({ pending: false });
  const pending = useRef(false);
  const generation = useRef(0);

  function reset() {
    ++generation.current;
    pending.current = false;
    setState({ pending: false });
  }

  function run(action: () => Promise<HardGame>, apply: (game: HardGame) => void, message: string) {
    if (pending.current) return;
    pending.current = true;
    const current = generation.current;
    setState({ pending: true });
    void action().then(game => {
      if (current !== generation.current) return;
      apply(game);
      setState({ pending: false });
    }).catch(error => {
      if (current !== generation.current) return;
      setState({
        pending: false,
        error: error instanceof CreditApiError && error.code === "CREDIT_INVALID_GAME_MOVE"
          ? "그 위치에는 블록을 놓을 수 없습니다."
          : message,
        retry: error instanceof CreditApiError && error.retryable ? () => run(action, apply, message) : undefined,
      });
    }).finally(() => {
      if (current === generation.current) pending.current = false;
    });
  }

  return { state, pending, run, reset };
}
