import { notifyAuthExpired } from "./auth";

export type RankingType = "normal" | "hard" | "trophy";

export interface RankingEntry {
  rank: number;
  userId: string;
  nickname: string;
  score: number;
}

interface RankingResponse {
  type: RankingType;
  rankings: RankingEntry[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const AUTH_TOKEN_KEY = "polyo.accessToken";

export async function fetchRanking(type: RankingType): Promise<RankingResponse> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/rankings?type=${type}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
  } catch {
    throw new Error("서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
  }
  if (response.status === 401) notifyAuthExpired();

  const result = (await response.json().catch(() => null)) as ApiResponse<RankingResponse> | null;
  if (!response.ok || !result?.success || !result.data) {
    throw new Error(result?.error?.message ?? "랭킹을 불러오지 못했습니다.");
  }
  return result.data;
}
