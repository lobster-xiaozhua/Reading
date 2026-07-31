import { Link } from "react-router-dom";

export default function AdminHeader({
  adminKeyInput,
  onKeyInputChange,
  onSaveKey,
  onClearKey,
  onReindex,
  keySavedHint,
  reindexMsg,
  health,
  busy,
}) {
  return (
    <header className="admin-header">
      <Link to="/" className="back-link">
        ← 返回书架
      </Link>
      <h1>书籍管理</h1>
      <span className="admin-hint">本地管理 · Header X-Admin-Key</span>
      <div className="admin-key-bar">
        <label>
          管理密钥
          <input
            type="password"
            value={adminKeyInput}
            onChange={(e) => onKeyInputChange(e.target.value)}
            placeholder="与后端 ADMIN_API_KEY 一致；留空则不发送"
            autoComplete="off"
          />
        </label>
        <button type="button" className="primary" onClick={onSaveKey} disabled={busy}>
          保存密钥
        </button>
        <button type="button" onClick={onClearKey} disabled={busy}>
          清除
        </button>
        <button type="button" onClick={onReindex} disabled={busy}>
          重建搜索索引
        </button>
        {keySavedHint && <span className="admin-hint">{keySavedHint}</span>}
        {reindexMsg && <span className="admin-hint">{reindexMsg}</span>}
      </div>
      {health && (
        <div className="admin-hint">
          服务：PostgreSQL {health.postgres ? "正常" : "异常"}
          {" · "}
          Meilisearch {health.meilisearch ? "正常" : "不可用/未连"}
        </div>
      )}
      <div className="security-banner">
        <strong>安全提示：</strong>
        若后端设置了 ADMIN_API_KEY，请在上方填写相同密钥（仅保存在本机 localStorage）。
        后端密钥为空时管理接口免认证（仅适合本地开发）。
      </div>
    </header>
  );
}