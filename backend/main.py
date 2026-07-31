from fastapi import FastAPI, HTTPException, File, UploadFile, Query, Depends, Security, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import APIKeyHeader
import os
import re
import structlog

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

import db
import search
import auth
from config import COVERS_DIR, ADMIN_API_KEY, MAX_COVER_MB
from schemas import (
    BookDetail,
    BookSummary,
    ChapterContent,
    BookIn,
    BookInfoIn,
    RenameIn,
    ChapterIn,
    ImportIn,
    TagsIn,
    ChapterOrderIn,
    UserRegister,
    UserLogin,
    TokenOut,
)

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)
logger = structlog.get_logger("main")

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="小说在线阅读 API", version="2.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS：开发环境允许前端 dev server，生产环境请通过环境变量 CORS_ORIGINS 配置
_cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================== 管理 API 认证 =====================
ADMIN_HEADER = APIKeyHeader(name="X-Admin-Key", auto_error=False)


async def require_admin(
    key: str = Security(ADMIN_HEADER),
    jwt_user: dict = Depends(auth.require_admin_optional),
):
    """管理接口认证：优先 JWT admin 角色，兼容旧版 X-Admin-Key。

    工作流程：
    1. 如果 JWT token 有效且用户是 admin → 通过
    2. 如果 ADMIN_API_KEY 已设置且 X-Admin-Key 匹配 → 通过
    3. 如果 ADMIN_API_KEY 为空（开发模式）→ 通过
    4. 否则 → 401
    """
    if jwt_user and jwt_user.get("is_admin"):
        return jwt_user
    if not config.ADMIN_API_KEY:
        return {"admin": True, "via": "dev_mode"}
    if key and key == config.ADMIN_API_KEY:
        return {"admin": True, "via": "api_key"}
    raise HTTPException(status_code=401, detail="管理认证失败：需要有效的 JWT 或 X-Admin-Key")

# 封面上传目录
COVERS_DIR.mkdir(parents=True, exist_ok=True)


@app.on_event("startup")
def on_startup():
    """初始化数据库与搜索引擎（Meili 不可用时不影响启动）。"""
    try:
        db.init_schema()
        logger.info("PostgreSQL schema 初始化完成")
    except Exception as e:
        logger.error("PostgreSQL 初始化失败，请检查连接配置: %s", e)
    try:
        search.init_meili()
    except Exception as e:
        logger.warning("Meilisearch 初始化跳过: %s", e)


def _sync_search(book_id: str):
    """写操作后把书籍同步进 Meili 索引（章节索引由导入/编辑时单独同步）。"""
    try:
        s = db.get_book_summary(book_id)
        if s:
            search.index_book(s.dict())
    except Exception as e:
        logger.warning("同步 Meili 书籍失败: %s", e)



def _chapter_idx(chapter_id: str) -> int:
    try:
        return int(str(chapter_id).split("_")[0])
    except Exception:
        logger.warning("_chapter_idx 解析失败，返回 0", chapter_id=chapter_id)
        return 0


def _sync_chapter(book_id: str, chapter_id: str, book_title: str = ""):
    """将单章写入 Meili。"""
    try:
        c = db.get_chapter(book_id, chapter_id)
        if not c:
            return
        title = book_title or c.book_title or book_id
        search.index_chapter(
            book_id,
            _chapter_idx(chapter_id),
            c.title,
            "\n".join(c.paragraphs or []),
            title,
        )
    except Exception as e:
        logger.warning("同步 Meili 章节失败: %s", e)


def _sync_all_chapters(book_id: str):
    """全书章节重建进 Meili（先删旧文档再写入）。"""
    try:
        search.remove_chapters_for_book(book_id)
        detail = db.get_book_detail(book_id)
        if not detail:
            return
        for ch in detail.chapters:
            _sync_chapter(book_id, ch.id, detail.title)
    except Exception as e:
        logger.warning("同步全书章节到 Meili 失败: %s", e)



@app.get("/api/books", response_model=list[BookSummary])
def api_list_books():
    """书籍列表（默认发现）。"""
    return db.list_books()


@app.get("/api/discover", response_model=list[BookSummary])
def api_discover(
    q: str = "",
    tags: list[str] = Query(default=[]),
    word_min: int = None,
    word_max: int = None,
    updated_after: str = None,
    updated_before: str = None,
    sort: str = "-updated_at",
):
    """发现页：精准筛选（书名/作者、标签、字数、更新时间、排序）。"""
    return db.list_books(
        {
            "q": q,
            "tags": tags,
            "word_min": word_min,
            "word_max": word_max,
            "updated_after": updated_after,
            "updated_before": updated_before,
            "sort": sort,
        }
    )


@app.get("/api/books/filter", response_model=list[BookSummary])
def api_filter_books(
    q: str = "",
    tags: list[str] = Query(default=[]),
    word_min: int = None,
    word_max: int = None,
    updated_after: str = None,
    updated_before: str = None,
    sort: str = "-updated_at",
):
    """兼容旧筛选接口。"""
    return db.list_books(
        {
            "q": q,
            "tags": tags,
            "word_min": word_min,
            "word_max": word_max,
            "updated_after": updated_after,
            "updated_before": updated_before,
            "sort": sort,
        }
    )


@app.get("/api/search")
@limiter.limit("10/minute")
def api_search(request: Request, q: str = "", page: int = 1, per_page: int = 20):
    try:
        return search.search(q, page=page, per_page=per_page)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/books/{book_id}", response_model=BookDetail)
def api_book_detail(book_id: str):
    """书籍详情 + 章节目录。"""
    book_id = db.sanitize_id(book_id)
    detail = db.get_book_detail(book_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="书籍不存在")
    return detail


@app.get("/api/books/{book_id}/chapters/{chapter_id}", response_model=ChapterContent)
def api_chapter(book_id: str, chapter_id: str):
    """单章内容。"""
    book_id = db.sanitize_id(book_id)
    chapter = db.get_chapter(book_id, chapter_id)
    if chapter is None:
        raise HTTPException(status_code=404, detail="章节不存在")
    return chapter


@app.get("/api/health")
def api_health():
    meili_ok = search.available()
    try:
        db_ok = db.ping()
    except Exception:
        db_ok = False
    ok = bool(db_ok)
    return {
        "ok": ok,
        "status": "ok" if ok else "degraded",
        "postgres": db_ok,
        "meilisearch": meili_ok,
    }


@app.get("/api/cover/{book_id}")
def api_cover(book_id: str):
    """封面图片（存于 /covers/<book_id>.<ext>）。"""
    book_id = db.sanitize_id(book_id)
    s = db.get_book_summary(book_id)
    if not s or not s.cover:
        raise HTTPException(status_code=404, detail="无封面")
    cover_name = s.cover
    if not re.fullmatch(r"[\w\-_.]+\.(jpg|jpeg|png|webp)", cover_name, re.IGNORECASE):
        raise HTTPException(status_code=400, detail="封面文件名非法")
    path = COVERS_DIR / cover_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="封面文件缺失")
    return FileResponse(path)


# ===================== 管理 API（无登录） =====================

@app.post("/api/admin/books", response_model=BookSummary)
@limiter.limit("30/minute")
def api_admin_create_book(request: Request, payload: BookIn, _: None = Depends(require_admin)):
    try:
        s = db.create_book(payload.id, payload.title, payload.author, payload.description, tags=payload.tags)
        _sync_search(s.id)
        return s
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/admin/books/{book_id}", response_model=BookSummary)
@limiter.limit("30/minute")
def api_admin_update_book(request: Request, book_id: str, payload: BookInfoIn, _: None = Depends(require_admin)):
    try:
        s = db.update_book_info(book_id, payload.title, payload.author, payload.description, tags=payload.tags)
        _sync_search(s.id)
        return s
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/admin/books/{book_id}/import", response_model=BookDetail)
@limiter.limit("10/minute")
def api_admin_import(request: Request, book_id: str, payload: ImportIn, _: None = Depends(require_admin)):
    """整本 txt 导入，自动分章。"""
    try:
        detail = db.import_full_text(book_id, payload.text)
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    _sync_all_chapters(book_id)
    _sync_search(book_id)
    return detail


@app.post("/api/admin/books/{book_id}/cover", response_model=BookSummary)
@limiter.limit("10/minute")
def api_admin_upload_cover(request: Request, book_id: str, file: UploadFile = File(...), _: None = Depends(require_admin)):
    """上传封面图，存为 /covers/<book_id>.<ext>。"""
    s = db.get_book_summary(book_id)
    if not s:
        raise HTTPException(status_code=404, detail="书籍不存在")
    allowed = {".jpg", ".jpeg", ".png", ".webp"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="仅支持 jpg/png/webp 图片")
    max_bytes = MAX_COVER_MB * 1024 * 1024
    if file.size and file.size > max_bytes:
        raise HTTPException(status_code=400, detail=f"封面图片过大（<{MAX_COVER_MB}MB）")
    data = file.file.read()
    if len(data) > max_bytes:
        raise HTTPException(status_code=400, detail=f"封面图片过大（<{MAX_COVER_MB}MB）")
    cover_name = f"{book_id}{ext}"
    with open(COVERS_DIR / cover_name, "wb") as f:
        f.write(data)
    s = db.set_cover(book_id, cover_name)
    _sync_search(book_id)
    return s


@app.put("/api/admin/books/{book_id}/tags", response_model=BookSummary)
@limiter.limit("30/minute")
def api_admin_set_tags(request: Request, book_id: str, payload: TagsIn, _: None = Depends(require_admin)):
    try:
        s = db.set_tags(book_id, payload.tags)
        _sync_search(book_id)
        return s
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/admin/books/{book_id}/rename", response_model=BookSummary)
@limiter.limit("10/minute")
def api_admin_rename_book(request: Request, book_id: str, payload: RenameIn, _: None = Depends(require_admin)):
    try:
        s = db.rename_book(book_id, payload.new_id)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    try:
        search.remove_book(book_id)
    except Exception:
        pass
    _sync_all_chapters(s.id)
    _sync_search(s.id)
    return s


@app.delete("/api/admin/books/{book_id}")
@limiter.limit("10/minute")
def api_admin_delete_book(request: Request, book_id: str, _: None = Depends(require_admin)):
    try:
        db.delete_book(book_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    try:
        search.remove_book(book_id)
    except Exception:
        pass
    return {"ok": True}


@app.post("/api/admin/books/{book_id}/chapters", response_model=BookDetail)
@limiter.limit("30/minute")
def api_admin_create_chapter(request: Request, book_id: str, payload: ChapterIn, _: None = Depends(require_admin)):
    try:
        detail = db.create_chapter(book_id, payload.title, payload.content)
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    if detail.chapters:
        _sync_chapter(book_id, detail.chapters[-1].id, detail.title)
    _sync_search(book_id)
    return detail


@app.put("/api/admin/books/{book_id}/chapters/{chapter_id}", response_model=BookDetail)
@limiter.limit("30/minute")
def api_admin_update_chapter(request: Request, book_id: str, chapter_id: str, payload: ChapterIn, _: None = Depends(require_admin)):
    try:
        detail = db.save_chapter(book_id, chapter_id, payload.title, payload.content)
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    _sync_chapter(book_id, chapter_id, detail.title)
    _sync_search(book_id)
    return detail


@app.put("/api/admin/books/{book_id}/chapters/reorder", response_model=BookDetail)
@limiter.limit("10/minute")
def api_admin_reorder_chapters(request: Request, book_id: str, payload: ChapterOrderIn, _: None = Depends(require_admin)):
    try:
        detail = db.reorder_chapters(book_id, payload.order)
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    _sync_all_chapters(book_id)
    _sync_search(book_id)
    return detail


@app.delete("/api/admin/books/{book_id}/chapters/{chapter_id}", response_model=BookDetail)
@limiter.limit("30/minute")
def api_admin_delete_chapter(request: Request, book_id: str, chapter_id: str, _: None = Depends(require_admin)):
    try:
        detail = db.delete_chapter(book_id, chapter_id)
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    try:
        search.remove_chapter(book_id, _chapter_idx(chapter_id))
    except Exception:
        pass
    _sync_all_chapters(book_id)
    _sync_search(book_id)
    return detail




@app.post("/api/admin/reindex")
@limiter.limit("1/minute")
def api_admin_reindex(request: Request, _: None = Depends(require_admin)):
    """从 PostgreSQL 全量重建 Meilisearch 索引。"""
    try:
        result = search.reindex_all()
    except Exception as e:
        logger.exception("reindex 失败")
        raise HTTPException(status_code=500, detail=str(e))
    if not result.get("ok"):
        raise HTTPException(status_code=503, detail="Meilisearch 不可用，无法重建索引")
    return result


# ===================== 用户认证 =====================

@app.post("/api/auth/register", response_model=TokenOut)
@limiter.limit("5/minute")
def api_register(request: Request, payload: UserRegister):
    return auth.register(payload.username, payload.password)


@app.post("/api/auth/login", response_model=TokenOut)
@limiter.limit("10/minute")
def api_login(request: Request, payload: UserLogin):
    return auth.login(payload.username, payload.password)


@app.get("/api/auth/me")
def api_me(user: dict = Depends(auth.require_user)):
    u = db.get_user_by_id(int(user["sub"]))
    if not u:
        raise HTTPException(status_code=404, detail="user not found")
    from schemas import UserOut
    return UserOut(id=u["id"], username=u["username"], is_admin=bool(u["is_admin"]), created_at=str(u["created_at"]))


# ===================== 用户书架 & 进度 =====================

@app.get("/api/user/favorites")
def api_favorites(user: dict = Depends(auth.require_user)):
    book_ids = db.get_bookmarks(int(user["sub"]))
    books = []
    for bid in book_ids:
        s = db.get_book_summary(bid)
        if s:
            books.append(s)
    return books


@app.post("/api/user/favorites/{book_id}")
def api_add_favorite(book_id: str, user: dict = Depends(auth.require_user)):
    db.add_bookmark(int(user["sub"]), book_id)
    return {"ok": True}


@app.delete("/api/user/favorites/{book_id}")
def api_remove_favorite(book_id: str, user: dict = Depends(auth.require_user)):
    db.remove_bookmark(int(user["sub"]), book_id)
    return {"ok": True}


@app.get("/api/user/progress")
def api_progress(user: dict = Depends(auth.require_user)):
    return db.get_all_progress(int(user["sub"]))


@app.put("/api/user/progress")
def api_save_progress(payload: dict, user: dict = Depends(auth.require_user)):
    db.save_progress(
        int(user["sub"]),
        payload["book_id"],
        payload.get("chapter_id", ""),
        payload.get("scroll_top", 0),
        payload.get("progress", 0),
    )
    minutes = payload.get("minutes", 0)
    chapters = payload.get("chapters_read", 0)
    if minutes > 0 or chapters > 0:
        db.record_reading_time(int(user["sub"]), minutes, chapters)
    return {"ok": True}


@app.get("/api/user/stats")
def api_stats(user: dict = Depends(auth.require_user)):
    return db.get_reading_stats(int(user["sub"]))


if __name__ == "__main__":
    import uvicorn

    from config import HOST, PORT

    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
