export interface AuthUser {
  id: string;
  loginId: string;
  nickname: string;
}

export interface LoginResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

interface ApiError {
  code: string;
  message: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, body: object): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
  } catch {
    throw new Error("서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
  }

  const result = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!response.ok || !result?.success || !result.data) {
    throw new Error(result?.error?.message ?? "요청을 처리하지 못했습니다.");
  }

  return result.data;
}

export function login(loginId: string, password: string) {
  return request<LoginResult>("/api/v1/auth/login", { loginId, password });
}

export function signup(loginId: string, password: string, nickname: string) {
  return request<{ userId: string; loginId: string; nickname: string }>("/api/v1/auth/signup", {
    loginId,
    password,
    nickname
  });
}

export const AUTH_TOKEN_KEY = "polyo.accessToken";
export const AUTH_USER_KEY = "polyo.user";
