import { AUTH_TOKEN_KEY, notifyAuthExpired } from "./auth";

export interface Profile {
  userId: string; loginId: string; nickname: string; normalBestScore: number; hardBestScore: number; trophyCount: number;
  equippedBaseBlocks: string[]; equippedSpecialBlocks: string[]; avatarBlockId: string; avatarBlockColor: string; avatarBackgroundColor: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}${path}`, {
    ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (response.status === 401) notifyAuthExpired();
  const body = await response.json().catch(() => null) as { success?: boolean; data?: T; error?: { message?: string } } | null;
  if (!response.ok || !body?.success || !body.data) throw new Error(body?.error?.message ?? "프로필을 불러오지 못했습니다.");
  return body.data;
}

export const profileApi = {
  get: () => request<Profile>("/api/v1/profile"),
  getById: (userId: string) => request<Profile>(`/api/v1/profile/${encodeURIComponent(userId)}`),
  update: (profile: Omit<Profile, "userId" | "loginId" | "normalBestScore" | "hardBestScore" | "trophyCount">) => request<Profile>("/api/v1/profile", { method: "PATCH", body: JSON.stringify(profile) }),
};
