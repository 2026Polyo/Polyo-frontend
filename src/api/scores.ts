import { AUTH_TOKEN_KEY, notifyAuthExpired } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

export interface SavedScore {
  gameMode: "normal" | "hard";
  bestScore: number;
}

export interface BestScores {
  normalBestScore: number;
  hardBestScore: number;
}

async function requestWithToken<T>(path: string, init: RequestInit): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) throw new Error("로그인이 필요합니다.");
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init.headers
      }
    });
  } catch {
    throw new Error("서버에 연결할 수 없습니다.");
  }
  if (response.status === 401) notifyAuthExpired();
  const result = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !result?.success || !result.data) {
    throw new Error(result?.error?.message ?? "점수를 처리할 수 없습니다.");
  }
  return result.data;
}

export function getMyBestScores() {
  return requestWithToken<BestScores>("/api/v1/scores/me", { method: "GET" });
}

export async function saveGameScore(gameMode: SavedScore["gameMode"], score: number): Promise<SavedScore> {
  return requestWithToken<SavedScore>("/api/v1/scores", {
    method: "POST",
    body: JSON.stringify({ gameMode, score })
  });
}
