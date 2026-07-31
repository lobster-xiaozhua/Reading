# AGENTS.md — 小说在线阅读站

前后端分离：`backend/`（FastAPI）+ `frontend/`（React 18 + Vite）。无 monorepo 根 package，无 lint/typecheck/测试脚本，勿臆造。

## 常用命令

```bash
# 后端
cd backend
pip install -r requirements.txt
python main.py                    # http://127.0.0.1:8000（config.HOST/PORT）

# 可选：旧版本地 books/ 迁入 PG + Meili
python migrate_from_files.py
python migrate_from_files.py --book <book_id>

# 全量重建 Meili（与 POST /api/admin/reindex 同源）
python reindex.py

# 前端
cd frontend
npm install
npm run dev                       # http://127.0.0.1:5173，/api 代理到 :8000
npm run build && npm run preview
```

## 环境与依赖服务

- 配置：`backend/.env`（模板 `.env.example`），`config.py` 用 `load_dotenv()`；勿提交 `.env`。
- **PostgreSQL 必需**：库名默认 `novel_db`；启动时 `db.init_schema()` 建表。`schema.sql` 仅作结构参考。
- **Meilisearch 可选**：默认 `http://127.0.0.1:7700`。不可用时服务仍启动，仅 `/api/search` 与 reindex 会失败；列表/阅读/管理不依赖它。
- `/api/health` 返回 `ok` / `postgres` / `meilisearch`。
- 变量见 `config.py`：`PG_*`、`MEILI_*`、`ADMIN_API_KEY`、`CHAPTER_SHARDS=16`、`MAX_IMPORT_MB`、`MAX_COVER_MB`。

## 管理鉴权

- `ADMIN_API_KEY` 为空：管理接口免认证（本地开发）。
- 非空：请求头 `X-Admin-Key` 必须匹配。
- 前端：`src/api.js` 从 localStorage（`novel-admin-key`）读取并附加 Header；Admin 页可保存/清除密钥。

## 架构要点（易漏）

- 入口：`backend/main.py`；存储 `db.py`；搜索 `search.py`；模型 `schemas.py`。
- 章节按 `md5(book_id) % 16` 分到 `chapters_00`…`chapters_15`。
- 写操作后同步 Meili（`_sync_search` / `_sync_chapter` / `_sync_all_chapters`）；删书会 `remove_book`（含章节文档）。
- 改名：PG 改 id 后删旧 Meili 文档并按新 id 重建索引。
- 封面：`backend/data/covers/`（gitignore）；API `/api/cover/{id}`。
- 旧数据：`backend/books/<id>/` 仅迁移用。
- 前端 API 相对路径 `/api/...`；Vite proxy，勿写死后端 origin。
- 管理前缀：`/api/admin/...`；重建索引：`POST /api/admin/reindex`。

## 前端结构

- 页面：`src/pages/` — Discover / SearchResults / BookDetail / Reader / Admin
- 组件：`src/components/`；筛选常量：`src/constants.js`

## 勿做

- 不要提交 covers、本地 DB、`.env`。
- 不要假设 Meili 对读路径必需。
- 不要在根目录找统一 npm/pip 入口。
