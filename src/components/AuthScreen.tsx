import { ArrowRight, LockKeyhole, Sparkles, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, login, signup, type AuthUser } from "../api/auth";

interface AuthScreenProps { onAuthenticated: (user: AuthUser) => void; }

function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [isSignup, setIsSignup] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function changeMode(nextSignup: boolean) {
    setIsSignup(nextSignup);
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!loginId.trim() || !password || (isSignup && !nickname.trim())) {
      setMessage("필수 항목을 모두 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        await signup(loginId.trim(), password, nickname.trim());
        setIsSignup(false);
        setPassword("");
        setMessage("가입이 완료되었습니다. 로그인해주세요.");
      } else {
        const result = await login(loginId.trim(), password);
        localStorage.setItem(AUTH_TOKEN_KEY, result.accessToken);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
        onAuthenticated(result.user);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell auth-shell">
      <section className="auth-layout" aria-label="Polyomino 인증">
        <div className="auth-intro">
          <div className="auth-block-logo" aria-hidden="true"><i /><i /><i /><i /></div>
          <p className="auth-kicker"><Sparkles size={16} /> BLOCK BY BLOCK</p>
          <h1>Polyomino</h1>
          <p className="auth-tagline">당신만의 블록 플레이를<br />다시 이어가세요.</p>
        </div>
        <div className="auth-card">
          <p className="auth-eyebrow">WELCOME BACK</p>
          <h2>{isSignup ? "새 계정 만들기" : "다시 만나요"}</h2>
          <div className="auth-tabs">
            <button className={!isSignup ? "active" : ""} onClick={() => changeMode(false)} type="button">로그인</button>
            <button className={isSignup ? "active" : ""} onClick={() => changeMode(true)} type="button">회원가입</button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            {isSignup && <label><span>닉네임</span><div className="auth-input"><UserRound size={18} /><input autoComplete="nickname" onChange={(e) => setNickname(e.target.value)} placeholder="플레이어 이름" value={nickname} /></div></label>}
            <label><span>아이디</span><div className="auth-input"><UserRound size={18} /><input autoComplete="username" onChange={(e) => setLoginId(e.target.value)} placeholder="아이디를 입력하세요" value={loginId} /></div></label>
            <label><span>비밀번호</span><div className="auth-input"><LockKeyhole size={18} /><input autoComplete={isSignup ? "new-password" : "current-password"} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호를 입력하세요" type="password" value={password} /></div></label>
            {message && <p className={message.includes("완료") ? "auth-message success" : "auth-message"} role="alert">{message}</p>}
            <button className="auth-submit" disabled={loading} type="submit">{loading ? "잠시만요..." : isSignup ? "회원가입 완료" : "게임 시작하기"}{!loading && <ArrowRight size={18} />}</button>
          </form>
          <p className="auth-footer">{isSignup ? "이미 계정이 있나요?" : "처음 오셨나요?"} <button onClick={() => changeMode(!isSignup)} type="button">{isSignup ? "로그인하기" : "계정 만들기"}</button></p>
        </div>
      </section>
    </main>
  );
}

export default AuthScreen;
