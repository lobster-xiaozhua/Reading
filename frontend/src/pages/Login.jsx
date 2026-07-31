import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiRegister, apiLogin } from "../api.ts";
import { useAuth } from "../auth.jsx";
import { useToast } from "../ToastContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const showToast = useToast();
  const [tab, setTab] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const validate = () => {
    if (!username.trim()) {
      setError("请输入用户名");
      return false;
    }
    if (username.trim().length < 2 || username.trim().length > 64) {
      setError("用户名需为 2-64 位字符");
      return false;
    }
    if (!password) {
      setError("请输入密码");
      return false;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setBusy(true);
    try {
      const fn = tab === "login" ? apiLogin : apiRegister;
      const data = await fn(username.trim(), password);
      login(data.token, data.user);
      showToast(tab === "login" ? "登录成功" : "注册成功", "success");
      navigate("/");
    } catch (e) {
      setError(e.message);
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-narrow" style={{ paddingTop: "80px", maxWidth: "400px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "24px", textAlign: "center" }}>
        {tab === "login" ? "登录" : "注册"}
      </h1>
      <div className="search-tabs" style={{ justifyContent: "center", marginBottom: "24px" }}>
        <button className={`search-tab ${tab === "login" ? "active" : ""}`} onClick={() => setTab("login")}>
          登录
        </button>
        <button className={`search-tab ${tab === "register" ? "active" : ""}`} onClick={() => setTab("register")}>
          注册
        </button>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <label>
          用户名
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="2-64 位字母、数字、中文、下划线"
            autoComplete="username"
            required
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
        <label>
          密码
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="至少 6 位"
            autoComplete={tab === "login" ? "current-password" : "new-password"}
            required
            style={{ width: "100%", marginTop: "4px" }}
          />
        </label>
        {error && <div className="hint error">{error}</div>}
        <button type="submit" className="primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? "处理中…" : tab === "login" ? "登录" : "注册"}
        </button>
      </form>
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <Link to="/" style={{ color: "var(--accent)", fontSize: "14px" }}>← 返回书架</Link>
      </div>
    </div>
  );
}