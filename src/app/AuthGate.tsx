import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthScreen from "../components/AuthScreen";
import {
  AUTH_EXPIRED_EVENT,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  AuthRequestError,
  clearAuth,
  getCurrentUser,
  type AuthUser,
} from "../api";
import AppShell from "./AppShell";

export default function AuthGate() {
  const navigate = useNavigate();
  const [authChecking, setAuthChecking] = useState(true);
  const [authCheckError, setAuthCheckError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    function handleAuthExpired() {
      setUser(null);
      navigate("/");
    }

    function handleStorage(event: StorageEvent) {
      if (
        (event.key === AUTH_TOKEN_KEY || event.key === AUTH_USER_KEY) &&
        !localStorage.getItem(AUTH_TOKEN_KEY)
      ) {
        handleAuthExpired();
      }
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    window.addEventListener("storage", handleStorage);
    const cleanupAuthListeners = () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
      window.removeEventListener("storage", handleStorage);
    };

    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setAuthChecking(false);
      return cleanupAuthListeners;
    }

    void getCurrentUser()
      .then((currentUser) => {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser));
        setUser(currentUser);
      })
      .catch((error: unknown) => {
        if (error instanceof AuthRequestError && error.status === 401) {
          clearAuth();
          return;
        }
        setAuthCheckError(
          "로그인 상태를 확인할 수 없습니다. 서버 연결을 확인한 뒤 다시 시도해주세요.",
        );
      })
      .finally(() => setAuthChecking(false));
    return cleanupAuthListeners;
  }, [navigate]);

  if (authChecking) return null;
  if (authCheckError) {
    return (
      <main className="app-shell auth-shell">
        <section className="auth-card" role="alert">
          <h1>로그인 상태 확인 실패</h1>
          <p>{authCheckError}</p>
          <button
            className="auth-submit"
            type="button"
            onClick={() => window.location.reload()}
          >
            다시 시도
          </button>
        </section>
      </main>
    );
  }
  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  return <AppShell user={user} onUserChange={setUser} />;
}
