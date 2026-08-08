import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useUserStore } from "@/stores/userStore";
import { fetcher } from "@/api/fetcher";
import {
  NovelBookClosed,
  NovelMoon,
  NovelReadingGlasses,
  NovelCrown,
} from "@novel/icons";
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
      {/* 装饰性浮层背景（纯 CSS 绘制，无图片请求） */}
      <div className="login-orb login-orb--brand" aria-hidden />
      <div className="login-orb login-orb--rose" aria-hidden />
      <div className="login-orb login-orb--gold" aria-hidden />
      <div className="login-blur-ring" aria-hidden />

      <div className="login-brand-side" aria-hidden>
        <div className="login-brand-mark">
          <NovelBookClosed size="2xl" aria-hidden="true" />
        </div>
        <p className="login-brand-name">Atlas 阅读</p>
        <p className="login-brand-tagline">海量好书 · 沉浸阅读 · 自在追更</p>
        <ul className="login-brand-points">
          <li>
            <NovelMoon size="sm" aria-hidden="true" />
            <span>多主题沉浸式阅读器</span>
          </li>
          <li>
            <NovelReadingGlasses size="sm" aria-hidden="true" />
            <span>智能推荐懂你所想</span>
          </li>
          <li>
            <NovelCrown size="sm" aria-hidden="true" />
            <span>书架同步，阅读进度不丢</span>
          </li>
        </ul>
      </div>

      <div className="login-card">
        <h1 className="login-title">
          欢迎回来
          <span className="login-title-sub">
            {tab === "login" ? "登录你的账号继续阅读" : "创建账号开启阅读之旅"}
          </span>
        </h1>
        <div className="login-tabs" role="tablist" aria-label="登录或注册">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "login"}
            className={`login-tab ${tab === "login" ? "active" : ""}`}
            onClick={() => {
              setTab("login");
              setError("");
            }}
          >
            登录
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "register"}
            className={`login-tab ${tab === "register" ? "active" : ""}`}
            onClick={() => {
              setTab("register");
              setError("");
            }}
          >
            注册
          </button>
        </div>
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <label className="login-field">
            <span className="login-label">用户名</span>
            <input
              className="login-input"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          {tab === "register" && (
            <label className="login-field">
              <span className="login-label">昵称（可选）</span>
              <input
                className="login-input"
                placeholder="给自己起个昵称"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </label>
          )}
          <label className="login-field">
            <span className="login-label">密码</span>
            <input
              className="login-input"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              required
            />
          </label>
          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="login-spinner" aria-hidden />
                处理中...
              </>
            ) : tab === "login" ? (
              "登录"
            ) : (
              "注册"
            )}
          </button>
        </form>
        <p className="login-hint">
          登录即表示同意《用户协议》与《隐私政策》
        </p>
      </div>
    </div>
  );
}
