import hashlib
import json
import re
from datetime import datetime
from typing import List, Optional
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
from psycopg2.extensions import connection as _PgConn
from psycopg2.pool import ThreadedConnectionPool

import config
from schemas import BookSummary, BookDetail, ChapterContent, ChapterMeta

# ---------- connection pool ----------
_pool: Optional[ThreadedConnectionPool] = None


def _get_pool() -> ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = ThreadedConnectionPool(
            1, 10,
            host=config.PG_HOST,
            port=config.PG_PORT,
            user=config.PG_USER,
            password=config.PG_PASSWORD,
            dbname=config.PG_DB,
            cursor_factory=psycopg2.extras.RealDictCursor,
        )
    return _pool


@contextmanager
def get_conn() -> _PgConn:
    pool = _get_pool()
    conn = pool.getconn()
    conn.autocommit = True
    try:
        yield conn
    finally:
        pool.putconn(conn)


@contextmanager
def _transaction():
    with get_conn() as conn:
        old = conn.autocommit
        conn.autocommit = False
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.autocommit = old


def ping() -> bool:
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return True
    except Exception:
        return False


def table_for(book_id: str) -> str:
    h = int(hashlib.md5(book_id.encode("utf-8")).hexdigest(), 16)
    return f"chapters_{h % config.CHAPTER_SHARDS:02d}"


def _validate_table_name(tbl: str) -> None:
    if not re.fullmatch(r"chapters_\d{2}", tbl):
        raise ValueError(f"invalid table name: {tbl!r}")


def init_schema():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS books (
                    id VARCHAR(191) PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    author VARCHAR(128) NOT NULL DEFAULT 'unknown',
                    description TEXT,
                    cover VARCHAR(255) DEFAULT NULL,
                    tags_json JSONB,
                    word_count INTEGER NOT NULL DEFAULT 0,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_books_updated ON books (updated_at);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_books_words ON books (word_count);")

            for i in range(config.CHAPTER_SHARDS):
                cur.execute(f"""
                    CREATE TABLE IF NOT EXISTS chapters_{i:02d} (
                        id BIGSERIAL PRIMARY KEY,
                        book_id VARCHAR(191) NOT NULL,
                        idx INTEGER NOT NULL,
                        title VARCHAR(255) NOT NULL,
                        content TEXT,
                        word_count INTEGER NOT NULL DEFAULT 0,
                        UNIQUE (book_id, idx)
                    );
                """)
                cur.execute(f"CREATE INDEX IF NOT EXISTS idx_chapters_{i:02d}_book ON chapters_{i:02d} (book_id);")

            cur.execute("""
                CREATE TABLE IF NOT EXISTS tags (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(64) NOT NULL UNIQUE
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS book_tags (
                    book_id VARCHAR(191) NOT NULL,
                    tag_id INTEGER NOT NULL,
                    PRIMARY KEY (book_id, tag_id)
                );
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_book_tags_tag ON book_tags (tag_id);")

            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id BIGSERIAL PRIMARY KEY,
                    username VARCHAR(64) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL DEFAULT '',
                    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS orders (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT,
                    book_id VARCHAR(191),
                    amount NUMERIC(10,2) DEFAULT 0.00,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);")

            cur.execute("""
                CREATE TABLE IF NOT EXISTS bookmarks (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    book_id VARCHAR(191) NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (user_id, book_id)
                );
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks (user_id);")

            cur.execute("""
                CREATE TABLE IF NOT EXISTS reading_progress (
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    book_id VARCHAR(191) NOT NULL,
                    chapter_id VARCHAR(64) NOT NULL DEFAULT '',
                    scroll_top INTEGER NOT NULL DEFAULT 0,
                    progress REAL NOT NULL DEFAULT 0,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, book_id)
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS reading_stats (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    minutes_read INTEGER NOT NULL DEFAULT 0,
                    chapters_read INTEGER NOT NULL DEFAULT 0,
                    UNIQUE (user_id, date)
                );
            """)


# ---------- helpers ----------
def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _parse_tags(raw) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except Exception:
            return []
    if isinstance(raw, dict):
        raw = list(raw.values())
    if isinstance(raw, list):
        return [str(t) for t in raw]
    return []


def _row_to_summary(row: dict) -> BookSummary:
    tags = _parse_tags(row.get("tags_json"))
    return BookSummary(
        id=row["id"],
        title=row["title"],
        author=row["author"],
        description=row.get("description") or "",
        cover=row.get("cover"),
        chapter_count=row.get("chapter_count", 0),
        tags=tags,
        word_count=row.get("word_count", 0) or 0,
        updated_at=str(row.get("updated_at")) if row.get("updated_at") else None,
    )


def sanitize_id(s: str) -> str:
    if not s:
        raise ValueError("id cannot be empty")
    cleaned = s.strip()
    if not cleaned:
        raise ValueError("id cannot be empty")
    for forbidden in ("/", "\\", "..", ":", "*", "?", '"', "<", ">", "|"):
        if forbidden in cleaned:
            raise ValueError(f"id contains illegal char: {forbidden!r}")
    if not re.fullmatch(r"[\w\u4e00-\u9fa5\-_.]+", cleaned):
        raise ValueError("id contains illegal characters")
    return cleaned


def _compute_chapter_count(book_id: str) -> int:
    tbl = table_for(book_id)
    _validate_table_name(tbl)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) AS c FROM {tbl} WHERE book_id=%s", (book_id,))
            return cur.fetchone()["c"]


def _compute_word_count(book_id: str) -> int:
    tbl = table_for(book_id)
    _validate_table_name(tbl)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT SUM(word_count) AS s FROM {tbl} WHERE book_id=%s", (book_id,))
            r = cur.fetchone()["s"]
            return int(r) if r else 0


# ---------- book CRUD ----------
def list_books(filter_params: Optional[dict] = None) -> List[BookSummary]:
    filter_params = filter_params or {}

    conditions = []
    params = []

    q = (filter_params.get("q") or "").strip()
    if q:
        conditions.append("(b.title ILIKE %s OR b.author ILIKE %s)")
        like_q = f"%{q}%"
        params.extend([like_q, like_q])

    tags = filter_params.get("tags") or []
    if tags:
        placeholders = ", ".join(["%s"] * len(tags))
        conditions.append(
            "b.id IN (SELECT bt.book_id FROM book_tags bt JOIN tags t ON t.id = bt.tag_id WHERE t.name IN (%s))"
            % placeholders
        )
        params.extend(tags)

    word_min = filter_params.get("word_min")
    if word_min is not None:
        conditions.append("b.word_count >= %s")
        params.append(word_min)

    word_max = filter_params.get("word_max")
    if word_max is not None:
        conditions.append("b.word_count <= %s")
        params.append(word_max)

    updated_after = filter_params.get("updated_after")
    if updated_after:
        conditions.append("b.updated_at >= %s")
        params.append(updated_after)

    updated_before = filter_params.get("updated_before")
    if updated_before:
        conditions.append("b.updated_at <= %s")
        params.append(updated_before)

    sort = filter_params.get("sort") or "-updated_at"
    reverse = sort.startswith("-")
    sort_key = sort.lstrip("-")
    allowed_sort = {"updated_at", "title", "word_count"}
    if sort_key not in allowed_sort:
        sort_key = "updated_at"
    direction = "DESC" if reverse else "ASC"

    where_clause = " AND ".join(conditions) if conditions else "TRUE"

    shards = [f"chapters_{i:02d}" for i in range(config.CHAPTER_SHARDS)]
    union_parts = [f"SELECT book_id, COUNT(*) AS c FROM {t} GROUP BY book_id" for t in shards]
    union_sql = " UNION ALL ".join(union_parts)

    sql = f"""
        SELECT b.*, COALESCE(cc.c, 0) AS chapter_count
        FROM books b
        LEFT JOIN ({union_sql}) AS cc ON cc.book_id = b.id
        WHERE {where_clause}
        ORDER BY b.{sort_key} {direction}
    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()

    return [_row_to_summary(r) for r in rows]


def get_book_summary(book_id: str) -> Optional[BookSummary]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM books WHERE id=%s", (book_id,))
            row = cur.fetchone()
    if not row:
        return None
    row["chapter_count"] = _compute_chapter_count(book_id)
    return _row_to_summary(row)


def get_book_detail(book_id: str) -> Optional[BookDetail]:
    summary = get_book_summary(book_id)
    if summary is None:
        return None
    chapters = get_chapters(book_id)
    return BookDetail(
        id=summary.id,
        title=summary.title,
        author=summary.author,
        description=summary.description,
        cover=summary.cover,
        chapters=chapters,
        tags=summary.tags,
        word_count=summary.word_count,
        updated_at=summary.updated_at,
    )


def get_chapters(book_id: str) -> List[ChapterMeta]:
    tbl = table_for(book_id)
    _validate_table_name(tbl)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT idx, title FROM {tbl} WHERE book_id=%s ORDER BY idx ASC",
                (book_id,),
            )
            rows = cur.fetchall()
    return [ChapterMeta(id=f"{r['idx']:03d}", title=r["title"]) for r in rows]


def get_chapter(book_id: str, chapter_id: str) -> Optional[ChapterContent]:
    tbl = table_for(book_id)
    _validate_table_name(tbl)
    try:
        idx = int(chapter_id.split("_")[0])
    except Exception:
        import structlog
        structlog.get_logger("db").warning("get_chapter 解析 chapter_id 失败", chapter_id=chapter_id)
        idx = 0
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT c.idx, c.title, c.content, COALESCE(b.title, %s) AS book_title "
                f"FROM {tbl} c LEFT JOIN books b ON b.id = c.book_id "
                f"WHERE c.book_id=%s AND c.idx=%s",
                (book_id, book_id, idx),
            )
            row = cur.fetchone()
        if not row:
            return None
        paras = [p.rstrip("\r") for p in (row["content"] or "").split("\n")]
        book_title = row["book_title"]
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT idx FROM {tbl} WHERE book_id=%s AND idx < %s ORDER BY idx DESC LIMIT 1",
                (book_id, idx),
            )
            prev_row = cur.fetchone()
            cur.execute(
                f"SELECT idx FROM {tbl} WHERE book_id=%s AND idx > %s ORDER BY idx ASC LIMIT 1",
                (book_id, idx),
            )
            next_row = cur.fetchone()
    prev_idx = prev_row["idx"] if prev_row else None
    next_idx = next_row["idx"] if next_row else None
    return ChapterContent(
        id=f"{idx:03d}",
        title=row["title"],
        book_id=book_id,
        book_title=book_title,
        prev=f"{prev_idx:03d}" if prev_idx else None,
        next=f"{next_idx:03d}" if next_idx else None,
        paragraphs=paras,
    )


def create_book(book_id, title, author="", description="", tags=None) -> BookSummary:
    bid = sanitize_id(book_id)
    tags = tags or []
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO books (id, title, author, description, tags_json, updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s) "
                "ON CONFLICT (id) DO UPDATE SET "
                "title=EXCLUDED.title, author=EXCLUDED.author, "
                "description=EXCLUDED.description, tags_json=EXCLUDED.tags_json, updated_at=EXCLUDED.updated_at",
                (bid, title or bid, author or "unknown", description or "",
                 json.dumps(tags, ensure_ascii=False), _now()),
            )
    _sync_tags(bid, tags)
    return get_book_summary(bid)


def update_book_info(book_id, title="", author="", description="", tags=None) -> BookSummary:
    existing = get_book_summary(book_id)
    if not existing:
        raise FileNotFoundError("book not found")
    tags = tags if tags is not None else existing.tags
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE books SET title=%s, author=%s, description=%s, tags_json=%s, updated_at=%s "
                "WHERE id=%s",
                (title or existing.title, author or existing.author, description or existing.description,
                 json.dumps(tags, ensure_ascii=False), _now(), book_id),
            )
    _sync_tags(book_id, tags)
    return get_book_summary(book_id)


def _sync_tags(book_id, tags):
    """将标签列表同步到 tags 和 book_tags 表。

    注意：此函数只做插入，不做清理。如果需要清空标签，请先调用
    DELETE FROM book_tags（由 set_tags 负责），再调用此函数。
    """
    if not tags:
        return
    with get_conn() as conn:
        with conn.cursor() as cur:
            for t in tags:
                cur.execute(
                    "INSERT INTO tags (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
                    (t,),
                )
            cur.execute(
                "SELECT id, name FROM tags WHERE name = ANY(%s)",
                (list(tags),),
            )
            tag_rows = cur.fetchall()
            for r in tag_rows:
                cur.execute(
                    "INSERT INTO book_tags (book_id, tag_id) VALUES (%s,%s) "
                    "ON CONFLICT (book_id, tag_id) DO NOTHING",
                    (book_id, r["id"]),
                )


def set_tags(book_id, tags) -> BookSummary:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM book_tags WHERE book_id=%s", (book_id,))
    _sync_tags(book_id, tags or [])
    return get_book_summary(book_id)


def set_cover(book_id, cover) -> BookSummary:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE books SET cover=%s, updated_at=%s WHERE id=%s", (cover, _now(), book_id))
    return get_book_summary(book_id)


def rename_book(old_id, new_id) -> BookSummary:
    oid = sanitize_id(old_id)
    nid = sanitize_id(new_id)
    with _transaction() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE books SET id=%s, updated_at=%s WHERE id=%s", (nid, _now(), oid))
            cur.execute("UPDATE book_tags SET book_id=%s WHERE book_id=%s", (nid, oid))
            tbl = table_for(oid)
            new_tbl = table_for(nid)
            _validate_table_name(tbl)
            _validate_table_name(new_tbl)
            if tbl != new_tbl:
                cur.execute(
                    f"INSERT INTO {new_tbl} (book_id, idx, title, content, word_count) "
                    f"SELECT %s, idx, title, content, word_count FROM {tbl} WHERE book_id=%s",
                    (nid, oid),
                )
                cur.execute(f"DELETE FROM {tbl} WHERE book_id=%s", (oid,))
            else:
                cur.execute(f"UPDATE {tbl} SET book_id=%s WHERE book_id=%s", (nid, oid))
    return get_book_summary(nid)


def delete_book(book_id) -> None:
    tbl = table_for(book_id)
    _validate_table_name(tbl)
    with _transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(f"DELETE FROM {tbl} WHERE book_id=%s", (book_id,))
            cur.execute("DELETE FROM books WHERE id=%s", (book_id,))
            cur.execute("DELETE FROM book_tags WHERE book_id=%s", (book_id,))
            cur.execute("DELETE FROM bookmarks WHERE book_id=%s", (book_id,))
            cur.execute("DELETE FROM reading_progress WHERE book_id=%s", (book_id,))


# ---------- chapter CRUD ----------
def _split_text(text: str):
    patterns = [
        re.compile(r"^\s*第\s*[0-9零一二三四五六七八九十百千]+[章回节卷集部篇]\b[^\n]*"),
        re.compile(r"^\s*[Cc]hapter\s*\d+\b[^\n]*"),
        re.compile(r"^\s*[Vv]ol\.?\s*\d+\b[^\n]*"),
        re.compile(r"^\s*序[章回]?\b[^\n]*"),
        re.compile(r"^\s*楔子\b[^\n]*"),
        re.compile(r"^\s*引子\b[^\n]*"),
        re.compile(r"^\s*番外\b[^\n]*"),
    ]

    def looks(line):
        return any(p.match(line) for p in patterns)

    lines = text.split("\n")
    chapters = []
    cur_title = None
    cur_lines = []

    def flush():
        if cur_title is None and not cur_lines:
            return
        content = "\n".join(cur_lines).strip("\n")
        if content or cur_title:
            chapters.append((cur_title or "全文", content))

    for line in lines:
        if looks(line):
            flush()
            cur_title = line.strip()
            cur_lines = []
        else:
            cur_lines.append(line)
    flush()
    if not chapters:
        return [("全文", text.strip())]
    return chapters


def import_full_text(book_id, text) -> BookDetail:
    if not text or not text.strip():
        raise ValueError("text is empty")
    pairs = _split_text(text)
    tbl = table_for(book_id)
    _validate_table_name(tbl)
    with _transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(f"DELETE FROM {tbl} WHERE book_id=%s", (book_id,))
            for idx, (title, content) in enumerate(pairs, start=1):
                safe = re.sub(r'[/\\:*?"<>|]', "_", title).strip() or f"ch_{idx}"
                wc = len(content)
                cur.execute(
                    f"INSERT INTO {tbl} (book_id, idx, title, content, word_count) VALUES (%s,%s,%s,%s,%s)",
                    (book_id, idx, safe, content, wc),
                )
        wc_total = _compute_word_count(book_id)
        with conn.cursor() as cur:
            cur.execute("UPDATE books SET word_count=%s, updated_at=%s WHERE id=%s", (wc_total, _now(), book_id))
    return get_book_detail(book_id)


def create_chapter(book_id, title, content) -> BookDetail:
    tbl = table_for(book_id)
    _validate_table_name(tbl)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT COALESCE(MAX(idx),0) AS m FROM {tbl} WHERE book_id=%s", (book_id,))
            idx = cur.fetchone()["m"] + 1
            safe = re.sub(r'[/\\:*?"<>|]', "_", title).strip() or f"ch_{idx}"
            cur.execute(
                f"INSERT INTO {tbl} (book_id, idx, title, content, word_count) VALUES (%s,%s,%s,%s,%s)",
                (book_id, idx, safe, content or "", len(content or "")),
            )
    _touch_words(book_id)
    return get_book_detail(book_id)


def save_chapter(book_id, chapter_id, title, content) -> BookDetail:
    tbl = table_for(book_id)
    _validate_table_name(tbl)
    try:
        idx = int(str(chapter_id).split("_")[0])
    except Exception:
        import structlog
        structlog.get_logger("db").warning("save_chapter 解析 chapter_id 失败", chapter_id=chapter_id)
        idx = 0
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE {tbl} SET title=%s, content=%s, word_count=%s WHERE book_id=%s AND idx=%s",
                (title, content or "", len(content or ""), book_id, idx),
            )
    _touch_words(book_id)
    return get_book_detail(book_id)


def delete_chapter(book_id, chapter_id) -> BookDetail:
    tbl = table_for(book_id)
    _validate_table_name(tbl)
    try:
        idx = int(str(chapter_id).split("_")[0])
    except Exception:
        import structlog
        structlog.get_logger("db").warning("delete_chapter 解析 chapter_id 失败", chapter_id=chapter_id)
        idx = 0
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(f"DELETE FROM {tbl} WHERE book_id=%s AND idx=%s", (book_id, idx))
    _touch_words(book_id)
    return get_book_detail(book_id)


def reorder_chapters(book_id: str, new_order: List[int]) -> BookDetail:
    tbl = table_for(book_id)
    _validate_table_name(tbl)
    with _transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT idx, title, content FROM {tbl} WHERE book_id=%s ORDER BY idx ASC",
                (book_id,),
            )
            rows = cur.fetchall()
            cur.execute(f"DELETE FROM {tbl} WHERE book_id=%s", (book_id,))
            for new_idx, old_idx in enumerate(new_order, start=1):
                row = next((r for r in rows if r["idx"] == old_idx), None)
                if row:
                    cur.execute(
                        f"INSERT INTO {tbl} (book_id, idx, title, content, word_count) VALUES (%s,%s,%s,%s,%s)",
                        (book_id, new_idx, row["title"], row["content"], len(row["content"] or "")),
                    )
        _touch_words(book_id)
    return get_book_detail(book_id)


def _touch_words(book_id):
    wc = _compute_word_count(book_id)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE books SET word_count=%s, updated_at=%s WHERE id=%s", (wc, _now(), book_id))


# ---------- user ----------
def get_user(username: str) -> Optional[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, username, password_hash, is_admin, created_at FROM users WHERE username=%s", (username,))
            return cur.fetchone()


def get_user_by_id(user_id: int) -> Optional[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, username, is_admin, created_at FROM users WHERE id=%s", (user_id,))
            return cur.fetchone()


def create_user(username: str, password_hash: str) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (username, password_hash, created_at) VALUES (%s,%s,%s) RETURNING id, username, created_at",
                (username, password_hash, _now()),
            )
            return cur.fetchone()


def is_admin(user_id: int) -> bool:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT is_admin FROM users WHERE id=%s", (user_id,))
            row = cur.fetchone()
            return bool(row["is_admin"]) if row else False


# ---------- bookmarks ----------
def add_bookmark(user_id: int, book_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO bookmarks (user_id, book_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                (user_id, book_id),
            )


def remove_bookmark(user_id: int, book_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM bookmarks WHERE user_id=%s AND book_id=%s", (user_id, book_id))


def get_bookmarks(user_id: int) -> List[str]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT book_id FROM bookmarks WHERE user_id=%s ORDER BY created_at DESC", (user_id,))
            return [r["book_id"] for r in cur.fetchall()]


# ---------- reading progress ----------
def save_progress(user_id: int, book_id: str, chapter_id: str, scroll_top: int, progress: float):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO reading_progress (user_id, book_id, chapter_id, scroll_top, progress, updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s) "
                "ON CONFLICT (user_id, book_id) DO UPDATE SET "
                "chapter_id=EXCLUDED.chapter_id, scroll_top=EXCLUDED.scroll_top, "
                "progress=EXCLUDED.progress, updated_at=EXCLUDED.updated_at",
                (user_id, book_id, chapter_id, scroll_top, progress, _now()),
            )


def get_progress(user_id: int, book_id: str) -> Optional[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT chapter_id, scroll_top, progress FROM reading_progress WHERE user_id=%s AND book_id=%s",
                (user_id, book_id),
            )
            return cur.fetchone()


def get_all_progress(user_id: int) -> List[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT book_id, chapter_id, scroll_top, progress, updated_at FROM reading_progress WHERE user_id=%s ORDER BY updated_at DESC",
                (user_id,),
            )
            return cur.fetchall()


# ---------- reading stats ----------
def record_reading_time(user_id: int, minutes: int, chapters: int = 0):
    today = _now()[:10]
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO reading_stats (user_id, date, minutes_read, chapters_read) "
                "VALUES (%s,%s,%s,%s) "
                "ON CONFLICT (user_id, date) DO UPDATE SET "
                "minutes_read=reading_stats.minutes_read+EXCLUDED.minutes_read, "
                "chapters_read=reading_stats.chapters_read+EXCLUDED.chapters_read",
                (user_id, today, minutes, chapters),
            )


def get_reading_stats(user_id: int) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COALESCE(SUM(minutes_read),0) AS total_minutes, "
                "COALESCE(SUM(chapters_read),0) AS total_chapters, "
                "COUNT(DISTINCT date) AS total_days "
                "FROM reading_stats WHERE user_id=%s",
                (user_id,),
            )
            totals = cur.fetchone()

            cur.execute(
                "SELECT minutes_read FROM reading_stats WHERE user_id=%s AND date=CURRENT_DATE",
                (user_id,),
            )
            today = cur.fetchone()

            cur.execute(
                "SELECT minutes_read FROM reading_stats WHERE user_id=%s "
                "AND date >= CURRENT_DATE - INTERVAL '7 days' ORDER BY date ASC",
                (user_id,),
            )
            week_rows = cur.fetchall()

            cur.execute(
                "SELECT date FROM reading_stats WHERE user_id=%s ORDER BY date DESC",
                (user_id,),
            )
            all_dates = [r["date"] for r in cur.fetchall()]

    streak = 0
    from datetime import date, timedelta
    check = date.today()
    for d in all_dates:
        if d == check:
            streak += 1
            check -= timedelta(days=1)
        else:
            break

    return {
        "today_minutes": today["minutes_read"] if today else 0,
        "week_minutes": sum(r["minutes_read"] for r in week_rows),
        "total_minutes": totals["total_minutes"],
        "total_chapters": totals["total_chapters"],
        "total_days": totals["total_days"],
        "streak": streak,
        "week_data": [r["minutes_read"] for r in week_rows],
    }