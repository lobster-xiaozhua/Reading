import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";
import { fetcher } from "@/api/fetcher";
import "./LoginPage.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res =
        tab === "login"
          ? await fetcher.auth.login(username, password)
          : await fetcher.auth.register(username, password, nickname);
      setAuth(res.token, res.user, res.expiresAt, res.refreshToken);
      useUserStore.getState().loadUser();
      navigate(params.get("redirect") || "/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Reading</h1>
        <div className="login-tabs">
          <button
            className={`login-tab ${tab === "login" ? "active" : ""}`}
            onClick={() => setTab("login")}
          >
            登录
          </button>
          <button
            className={`login-tab ${tab === "register" ? "active" : ""}`}
            onClick={() => setTab("register")}
          >
            注册
          </button>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <input
            className="login-input"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {tab === "register" && (
            <input
              className="login-input"
              placeholder="昵称（可选）"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          )}
          <input
            className="login-input"
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="login-error">{error}</p>}
          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? "处理中..." : tab === "login" ? "登录" : "注册"}
          </button>
        </form>
        <p className="login-hint">登录后可使用书架、阅读记录等功能</p>
      </div>
    </div>
  );
}
