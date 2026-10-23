import { ArrowRight, Gamepad2, KeyRound, LockKeyhole, Sparkles, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, login, signup, type AuthUser } from "../api/auth";

type AuthMode = "login" | "signup";

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void;
}

function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignup = mode === "signup";

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!loginId.trim() || !password) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    if (isSignup && !nickname.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignup) {
        await signup(loginId.trim(), password, nickname.trim());
        setMode("login");
        setPassword("");
        setNotice("가입이 완료되었습니다. 이제 로그인해주세요.");
      } else {
        const result = await login(loginId.trim(), password);
        localStorage.setItem(AUTH_TOKEN_KEY, result.accessToken);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
        onAuthenticated(result.user);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "요청을 처리하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell auth-shell">
      <section className="auth-layout" aria-label="Polyomino 인증">
        <div className="auth-intro">
          <div className="auth-brand-mark" aria-hidden="true">
            <span className="auth-brand-cell cell-cyan" />
            <span className="auth-brand-cell cell-lime" />
            <span className="auth-brand-cell cell-orange" />
            <span className="auth-brand-cell cell-violet" />
          </div>
          <p className="auth-kicker"><Sparkles size={16} aria-hidden="true" /> BLOCK BY BLOCK</p>
          <h1>Polyomino</h1>
          <p className="auth-tagline">당신만의 블록 플레이를<br />다시 이어가세요.</p>
          <div className="auth-feature-list">
            <span><Gamepad2 size={17} aria-hidden="true" /> 나만의 덱으로 시작하기</span>
            <span><KeyRound size={17} aria-hidden="true" /> 안전하게 플레이 기록 저장</span>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-heading">
            <div>
              <p className="auth-card-eyebrow">WELCOME BACK</p>
              <h2>{isSignup ? "새 계정 만들기" : "다시 만나요"}</h2>
            </div>
            <div className="auth-lock" aria-hidden="true"><LockKeyhole size={20} /></div>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="인증 방식 선택">
            <button className={!isSignup ? "is-active" : ""} onClick={() => changeMode("login")} role="tab" type="button">
              로그인
            </button>
            <button className={isSignup ? "is-active" : ""} onClick={() => changeMode("signup")} role="tab" type="button">
              회원가입
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignup && (
              <label className="auth-field">
                <span>닉네임</span>
                <div className="auth-input-wrap">
                  <UserRound size={18} aria-hidden="true" />
                  <input autoComplete="nickname" onChange={(event) => setNickname(event.target.value)} placeholder="플레이어 이름" value={nickname} />
                </div>
              </label>
            )}
            <label className="auth-field">
              <span>아이디</span>
              <div className="auth-input-wrap">
                <UserRound size={18} aria-hidden="true" />
                <input autoComplete="username" onChange={(event) => setLoginId(event.target.value)} placeholder="아이디를 입력하세요" value={loginId} />
              </div>
            </label>
            <label className="auth-field">
              <span>비밀번호</span>
              <div className="auth-input-wrap">
                <LockKeyhole size={18} aria-hidden="true" />
                <input autoComplete={isSignup ? "new-password" : "current-password"} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호를 입력하세요" type="password" value={password} />
              </div>
            </label>

            {notice && <p className="auth-notice" role="status">{notice}</p>}
            {error && <p className="auth-error" role="alert">{error}</p>}

            <button className="auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "잠시만요..." : isSignup ? "회원가입 완료" : "게임 시작하기"}
              {!isSubmitting && <ArrowRight size={19} aria-hidden="true" />}
            </button>
          </form>

          <p className="auth-card-footer">
            {isSignup ? "이미 계정이 있나요?" : "처음 오셨나요?"}{" "}
            <button onClick={() => changeMode(isSignup ? "login" : "signup")} type="button">
              {isSignup ? "로그인하기" : "계정 만들기"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}

export default AuthScreen;
