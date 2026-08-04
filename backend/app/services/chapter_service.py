"""B 端章节管理服务（§8.4）。

提供章节列表、详情、新建/编辑、排序、状态流转、批量操作、删除。
已发布章节删除需标题匹配（对齐前端 mock）。
"""

import logging
import time

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BizError, ErrorCode, NotFoundError
from app.models.novel import Chapter
from app.repositories.chapter_repo import ChapterRepository
from app.schemas.b_end import (
    BChapterDetail,
    BChapterListItem,
    ChapterBatchOperateBody,
    ChapterReorderBody,
    ChapterSubmitBody,
    ChapterTransitionBody,
    ChapterUpdateBody,
)
from app.schemas.common import BatchOperateResult
from app.utils.state_machine import ChapterStateMachine

logger = logging.getLogger(__name__)


class ChapterService:
    """B 端章节管理服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = ChapterRepository(session)

    # ── 章节列表 ─────────────────────────────────────────
    async def list_chapters(self, novel_id: int) -> list[BChapterListItem]:
        """获取作品的章节列表。

        Args:
            novel_id: 作品 ID。

        Returns:
            章节列表项。
        """
        chapters = await self.repo.list_by_novel(novel_id)
        return [_to_list_item(c) for c in chapters]

    # ── 章节详情 ─────────────────────────────────────────
    async def get_detail(self, chapter_id: int) -> BChapterDetail:
        """获取章节详情（含正文内容）。

        Args:
            chapter_id: 章节 ID。

        Returns:
            章节详情。
        """
        chapter = await self._get_chapter(chapter_id)
        return BChapterDetail(
            id=str(chapter.id),
            novel_id=str(chapter.novel_id),
            index=chapter.index,
            title=chapter.title,
            word_count=chapter.word_count,
            pure_word_count=chapter.pure_word_count,
            punctuation_word_count=chapter.punctuation_word_count,
            status=chapter.status,
            audit_level=chapter.audit_level,
            is_vip=bool(chapter.is_vip),
            published_at=chapter.published_at,
            created_at=chapter.created_at,
            updated_at=chapter.updated_at,
            content=chapter.content,
        )

    # ── 新建章节 ─────────────────────────────────────────
    async def create_chapter(self, body: ChapterSubmitBody) -> BChapterDetail:
        """新建章节（自动计算 index 和字数统计）。

        Args:
            body: 章节创建数据。

        Returns:
            新建的章节详情。
        """
        novel_id = int(body.novel_id)
        # 计算下一个 index
        existing = await self.repo.list_by_novel(novel_id)
        next_index = len(existing)
        word_count, pure_count, punct_count = _count_words(body.content)
        chapter = Chapter(
            novel_id=novel_id,
            index=next_index,
            title=body.title,
            content=body.content,
            content_text=body.content,
            word_count=word_count,
            pure_word_count=pure_count,
            punctuation_word_count=punct_count,
            is_vip=1 if body.is_vip else 0,
            status="draft",
            audit_level=body.audit_level,
        )
        self.session.add(chapter)
        await self.session.flush()
        await self.session.commit()
        return await self.get_detail(chapter.id)

    # ── 编辑章节 ─────────────────────────────────────────
    async def update_chapter(self, chapter_id: int, body: ChapterUpdateBody) -> BChapterDetail:
        """编辑章节（标题/内容/是否 VIP 可更新，字数自动重算）。

        Args:
            chapter_id: 章节 ID。
            body: 章节更新数据。

        Returns:
            更新后的章节详情。
        """
        chapter = await self._get_chapter(chapter_id)
        if body.title is not None:
            chapter.title = body.title
        if body.content is not None:
            chapter.content = body.content
            chapter.content_text = body.content
            word_count, pure_count, punct_count = _count_words(body.content)
            chapter.word_count = word_count
            chapter.pure_word_count = pure_count
            chapter.punctuation_word_count = punct_count
        if body.is_vip is not None:
            chapter.is_vip = 1 if body.is_vip else 0
        await self.session.commit()
        return await self.get_detail(chapter_id)

    # ── 章节排序 ─────────────────────────────────────────
    async def reorder_chapters(self, novel_id: int, body: ChapterReorderBody) -> bool:
        """重新排序章节。

        Args:
            novel_id: 作品 ID。
            body: 排序数据（ordered_ids 顺序列表）。

        Returns:
            操作是否成功。
        """
        ordered_ids = [int(i) for i in body.ordered_ids]
        await self.repo.reorder(novel_id, ordered_ids)
        await self.session.commit()
        return True

    # ── 状态流转 ─────────────────────────────────────────
    async def transition(self, chapter_id: int, body: ChapterTransitionBody) -> BChapterDetail:
        """执行章节状态流转。

        Args:
            chapter_id: 章节 ID。
            body: 状态流转请求体（含目标状态）。

        Returns:
            更新后的章节详情。
        """
        chapter = await self._get_chapter(chapter_id)
        ChapterStateMachine.assert_transition(chapter.status, body.target)
        chapter.status = body.target
        if body.target == "published":
            chapter.published_at = int(time.time() * 1000)
        await self.session.commit()
        return await self.get_detail(chapter_id)

    # ── 批量操作 ─────────────────────────────────────────
    async def batch_operate(self, body: ChapterBatchOperateBody) -> BatchOperateResult:
        """批量操作章节（提审/发布）。

        Args:
            body: 批量操作请求体。

        Returns:
            批量操作结果。
        """
        failed: list[dict] = []
        success_count = 0
        for cid in body.ids:
            try:
                chapter = await self._get_chapter(cid)
                target_map = {"submit": "pending", "publish": "published"}
                target = target_map.get(body.action)
                if not target:
                    raise BizError(ErrorCode.PARAM_INVALID, f"不支持的操作: {body.action}")
                ChapterStateMachine.assert_transition(chapter.status, target)
                chapter.status = target
                if target == "published":
                    chapter.published_at = int(time.time() * 1000)
                success_count += 1
            except BizError as e:
                failed.append({"id": cid, "reason": e.message})
        await self.session.commit()
        return BatchOperateResult(
            success=len(failed) == 0,
            affected=success_count,
            failed=failed or None,
        )

    # ── 删除章节 ─────────────────────────────────────────
    async def delete_chapter(self, chapter_id: int, title_match: str = "") -> bool:
        """删除章节（已发布章节需标题匹配确认）。

        Args:
            chapter_id: 章节 ID。
            title_match: 已发布章节的标题确认（需完全匹配）。

        Returns:
            操作是否成功。
        """
        chapter = await self._get_chapter(chapter_id)
        # 已发布章节需标题匹配
        if chapter.status == "published" and title_match != chapter.title:
            raise BizError(
                ErrorCode.CHAPTER_TITLE_MISMATCH,
                "已发布章节删除需标题完全匹配",
            )
        chapter.deleted = 1
        await self.session.commit()
        return True

    # ── 内部工具 ─────────────────────────────────────────
    async def _get_chapter(self, chapter_id: int) -> Chapter:
        chapter = await self.repo.get_by_id(chapter_id)
        if not chapter or chapter.deleted:
            raise NotFoundError("章节不存在")
        return chapter


def _to_list_item(ch: Chapter) -> BChapterListItem:
    return BChapterListItem(
        id=str(ch.id),
        novel_id=str(ch.novel_id),
        index=ch.index,
        title=ch.title,
        word_count=ch.word_count,
        pure_word_count=ch.pure_word_count,
        punctuation_word_count=ch.punctuation_word_count,
        status=ch.status,
        audit_level=ch.audit_level,
        is_vip=bool(ch.is_vip),
        published_at=ch.published_at,
        created_at=ch.created_at,
        updated_at=ch.updated_at,
    )


def _count_words(content: str) -> tuple[int, int, int]:
    """统计字数：(总字数, 纯文字字数, 含标点字数)。

    纯文字：不含标点符号的字符数
    含标点：所有非空白字符数（稿费口径）
    """
    if not content:
        return 0, 0, 0
    import re
    # 去除 HTML 标签
    text = re.sub(r"<[^>]+>", "", content)
    # 含标点字数：非空白字符
    punct_count = len(re.sub(r"\s+", "", text))
    # 纯文字字数：中文 + 字母 + 数字
    pure_count = len(re.findall(r"[\u4e00-\u9fa5a-zA-Z0-9]", text))
    return punct_count, pure_count, punct_count
