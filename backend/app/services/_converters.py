"""ORM → Schema 转换器，避免在各 service 中重复实现。

使用 orjson 优化序列化路径，减少 dict 中间层的内存分配。
"""

import contextlib

from app.models.novel import Novel
from app.schemas.b_end import BNovelDetail
from app.schemas.c_end import BookSummary
from app.schemas.enums import BNovelStatus, BookFlag, CNovelStatus


def _parse_flags(flags_str: str | None) -> list[BookFlag]:
    if not flags_str:
        return []
    result: list[BookFlag] = []
    for f in flags_str.split(","):
        f = f.strip()
        with contextlib.suppress(ValueError):
            result.append(BookFlag(f))
    return result


def _parse_tags(tags_str: str | None) -> list[str]:
    if not tags_str:
        return []
    return [t.strip() for t in tags_str.split(",") if t.strip()]


def novel_to_c_summary(novel: Novel) -> BookSummary:
    """ORM Novel → C 端 BookSummary。"""
    status = CNovelStatus.COMPLETED if novel.is_completed else CNovelStatus.ONGOING
    return BookSummary(
        id=str(novel.id),
        title=novel.title,
        author=novel.author_name,
        cover=novel.cover or "",
        category=novel.category,
        tags=_parse_tags(novel.tags_str),
        word_count=novel.word_count,
        status=status,
        rating=float(novel.rating),
        rating_count=novel.rating_count,
        follow_count=novel.follow_count,
        click_count=novel.click_count,
        intro=novel.intro or "",
        flags=_parse_flags(novel.flags),
        last_updated=novel.updated_at,
    )


def novel_to_b_detail(novel: Novel) -> BNovelDetail:
    """ORM Novel → B 端 BNovelDetail。"""
    status = (
        BNovelStatus(novel.status)
        if novel.status in BNovelStatus._value2member_map_
        else BNovelStatus.DRAFT
    )
    return BNovelDetail(
        id=str(novel.id),
        title=novel.title,
        author_id=str(novel.author_id),
        author=novel.author_name,
        category=novel.category,
        cover=novel.cover or "",
        intro=novel.intro or "",
        word_count=novel.word_count,
        status=status,
        flags=_parse_flags(novel.flags),
        tags=_parse_tags(novel.tags_str),
        rating=float(novel.rating),
        rating_count=novel.rating_count,
        follow_count=novel.follow_count,
        click_count=novel.click_count,
        chapter_count=0,
        price=float(novel.price),
        author_remark=novel.author_remark or "",
        published_at=novel.published_at,
        shelved_at=novel.shelved_at,
        offline_reason=novel.offline_reason or "",
        offline_remark=novel.offline_remark or "",
        created_at=novel.created_at,
        updated_at=novel.updated_at,
        last_updated=novel.updated_at,
        is_completed=bool(novel.is_completed),
    )
