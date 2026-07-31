"""Meilisearch 全文检索封装。

职责：
- 书籍索引（books）与章节索引（chapters）
- 中文检索、相关性排序、高亮片段（snippet）
- 懒初始化：Meili 不可用时不阻塞后端启动
"""
import structlog
from typing import Any, Dict, List, Optional

import config

logger = structlog.get_logger("search")

_client = None
_initialized = False


def _get_client():
    global _client
    if _client is None:
        from meilisearch import Client

        _client = Client(config.MEILI_HOST, config.MEILI_API_KEY or None)
    return _client


def init_meili() -> bool:
    """初始化索引（建索引 + 配置）。返回是否成功。"""
    global _initialized
    try:
        client = _get_client()
        for name in (config.MEILI_BOOKS_INDEX, config.MEILI_CHAPTERS_INDEX):
            try:
                client.create_index(name, options={"primaryKey": "id"})
            except Exception:
                pass
        books_idx = client.index(config.MEILI_BOOKS_INDEX)
        books_idx.update_settings({
            "searchableAttributes": ["title", "author", "description", "tags"],
            "displayedAttributes": ["id", "title", "author", "description", "tags", "cover"],
            "filterableAttributes": ["tags"],
        })
        chapters_idx = client.index(config.MEILI_CHAPTERS_INDEX)
        chapters_idx.update_settings({
            "searchableAttributes": ["title", "content", "book_title"],
            "displayedAttributes": ["id", "book_id", "title", "content", "book_title"],
            "filterableAttributes": ["book_id"],
        })
        _initialized = True
        logger.info("Meilisearch 初始化成功")
        return True
    except Exception as e:
        logger.warning("Meilisearch 不可用，搜索功能将不可用: %s", e)
        _initialized = False
        return False


def available() -> bool:
    return _initialized


def chapter_doc_id(book_id: str, idx: int) -> str:
    return f"{book_id}__{idx:03d}"


def index_book(book: Dict[str, Any]) -> None:
    if not available():
        return
    client = _get_client()
    doc = {
        "id": book["id"],
        "title": book["title"],
        "author": book.get("author", ""),
        "description": book.get("description", ""),
        "tags": book.get("tags", []),
        "cover": book.get("cover"),
    }
    client.index(config.MEILI_BOOKS_INDEX).add_documents([doc])


def index_chapter(book_id: str, idx: int, title: str, content: str, book_title: str) -> None:
    if not available():
        return
    client = _get_client()
    doc = {
        "id": chapter_doc_id(book_id, idx),
        "book_id": book_id,
        "title": title,
        "content": content,
        "book_title": book_title,
    }
    client.index(config.MEILI_CHAPTERS_INDEX).add_documents([doc])


def remove_chapter(book_id: str, idx: int) -> None:
    if not available():
        return
    try:
        _get_client().index(config.MEILI_CHAPTERS_INDEX).delete_document(chapter_doc_id(book_id, idx))
    except Exception as e:
        logger.warning("删除 Meili 章节失败: %s", e)


def remove_chapters_for_book(book_id: str) -> None:
    """按 book_id 过滤删除该书全部章节文档。"""
    if not available():
        return
    client = _get_client()
    idx = client.index(config.MEILI_CHAPTERS_INDEX)
    safe = str(book_id).replace("\\", "\\\\").replace('"', '\\"')
    filt = f'book_id = "{safe}"'
    try:
        # meilisearch-python 不同版本：delete_documents(filter=...) 或 delete_documents_by_filter
        if hasattr(idx, "delete_documents_by_filter"):
            idx.delete_documents_by_filter(filt)
        else:
            try:
                idx.delete_documents(filter=filt)
            except TypeError:
                # 旧客户端无 filter：拉取 id 再删（书章节量通常可控）
                ids = []
                offset = 0
                while True:
                    res = idx.search("", {"filter": filt, "limit": 1000, "offset": offset, "attributesToRetrieve": ["id"]})
                    hits = res.get("hits") or []
                    if not hits:
                        break
                    ids.extend(h["id"] for h in hits if h.get("id"))
                    offset += len(hits)
                    if len(hits) < 1000:
                        break
                if ids:
                    idx.delete_documents(ids)
    except Exception as e:
        logger.warning("按书删除 Meili 章节失败: %s", e)



def remove_book(book_id: str) -> None:
    if not available():
        return
    client = _get_client()
    try:
        client.index(config.MEILI_BOOKS_INDEX).delete_document(book_id)
    except Exception as e:
        logger.warning("删除 Meili 书籍失败: %s", e)
    remove_chapters_for_book(book_id)


def reindex_all() -> Dict[str, int]:
    """从 PostgreSQL 全量重建 books + chapters 索引。Meili 不可用时返回零计数。"""
    import db

    if not available():
        if not init_meili():
            return {"books": 0, "chapters": 0, "ok": False}

    books = db.list_books()
    book_n = 0
    chapter_n = 0
    for s in books:
        try:
            index_book(s.dict() if hasattr(s, "dict") else dict(s))
            book_n += 1
        except Exception as e:
            logger.warning("reindex book %s: %s", getattr(s, "id", s), e)
        bid = s.id
        try:
            metas = db.get_chapters(bid)
            for ch in metas:
                try:
                    idx = int(str(ch.id).split("_")[0])
                except Exception:
                    continue
                c = db.get_chapter(bid, ch.id)
                if not c:
                    continue
                index_chapter(
                    bid,
                    idx,
                    ch.title,
                    "\n".join(c.paragraphs or []),
                    s.title,
                )
                chapter_n += 1
        except Exception as e:
            logger.warning("reindex chapters %s: %s", bid, e)
    return {"books": book_n, "chapters": chapter_n, "ok": True}


def search(q: str, page: int = 1, per_page: int = 20) -> Dict[str, Any]:
    """返回 {books, chapters, total, page, per_page}，含高亮片段。"""
    if not available():
        raise RuntimeError("搜索引擎不可用（Meilisearch 未连接）")
    client = _get_client()
    q = (q or "").strip()
    if not q:
        return {"books": [], "chapters": [], "total": 0, "page": 1, "per_page": per_page}

    offset = (page - 1) * per_page
    books_res = client.index(config.MEILI_BOOKS_INDEX).search(
        q,
        {
            "limit": per_page,
            "offset": offset,
            "attributesToHighlight": ["title", "description"],
            "highlightPreTag": "<mark>",
            "highlightPostTag": "</mark>",
        },
    )
    chapters_res = client.index(config.MEILI_CHAPTERS_INDEX).search(
        q,
        {
            "limit": per_page,
            "offset": offset,
            "attributesToHighlight": ["title", "content"],
            "highlightPreTag": "<mark>",
            "highlightPostTag": "</mark>",
            "attributesToCrop": ["content"],
            "cropLength": 80,
        },
    )
    total = (books_res.get("estimatedTotalHits") or 0) + (chapters_res.get("estimatedTotalHits") or 0)
    chapters_raw = chapters_res.get("hits", [])
    book_chapter_counts = {}
    for ch in chapters_raw:
        bid = ch.get("book_id") or ch.get("id", "").split("__")[0]
        if bid:
            book_chapter_counts[bid] = book_chapter_counts.get(bid, 0) + 1

    book_snippets = {}
    for ch in chapters_raw:
        bid = ch.get("book_id") or ch.get("id", "").split("__")[0]
        if not bid:
            continue
        content = ch.get("_formatted", {}).get("content", ch.get("content", ""))
        if "<mark>" in content:
            parts = content.split("<mark>")
            snippets = []
            for i in range(1, min(len(parts), 6)):
                snippet_text = parts[i].split("</mark>")[0] if "</mark>" in parts[i] else parts[i]
                before = parts[i - 1][-30:] if i > 0 else ""
                after = (
                    parts[i].split("</mark>")[1][:30]
                    if "</mark>" in parts[i] and len(parts[i].split("</mark>")) > 1
                    else ""
                )
                snippet_full = before + "<mark>" + snippet_text + "</mark>" + after
                snippets.append({
                    "chapter_id": ch.get("id", "").split("__")[1] if "__" in ch.get("id", "") else ch.get("id"),
                    "chapter_title": ch.get("title", ""),
                    "snippet": snippet_full,
                })
            if snippets:
                if bid not in book_snippets:
                    book_snippets[bid] = []
                book_snippets[bid].extend(snippets[: 5 - len(book_snippets.get(bid, []))])

    books_enriched = []
    for b in books_res.get("hits", []):
        bid = b.get("id")
        b["_chapter_count"] = book_chapter_counts.get(bid, 0)
        b["_chapter_snippets"] = book_snippets.get(bid, [])[:5]
        books_enriched.append(b)

    books_enriched.sort(
        key=lambda b: (b.get("_chapter_count", 0), b.get("_formatted", {}).get("title", b.get("title", ""))),
        reverse=True,
    )

    return {
        "books": books_enriched,
        "chapters": chapters_raw,
        "total": total,
        "page": page,
        "per_page": per_page,
    }
