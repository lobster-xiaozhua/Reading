"""B 端作品管理服务（§8.3）。

提供作品列表、详情、新建/编辑、批量操作（提审/上下架/删除）、状态流转。
状态转换走 ``NovelStateMachine`` 校验。
"""

import contextlib

import redis.asyncio as redis
import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BizError, ErrorCode, NotFoundError
from app.core.redis import CacheKeys
from app.models.novel import Novel
from app.repositories.novel_repo import NovelRepository
from app.schemas.b_end import (
    BatchOperateResponse,
    BNovelDetail,
    NovelListParams,
    NovelListResponse,
    NovelSubmitBody,
)
from app.schemas.common import BatchOperateResult
from app.services._converters import novel_to_b_detail
from app.utils.batch import batch_execute
from app.utils.state_machine import NovelStateMachine
from app.utils.time import now_ms as _now_ms

logger = structlog.get_logger(__name__)


class NovelService:
    """B 端作品管理服务。"""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis | None = None) -> None:
        self.session = session
        self.redis = redis_client
        self.repo = NovelRepository(session)

    # ── 作品列表 ─────────────────────────────────────────
    async def list_novels(self, params: NovelListParams) -> NovelListResponse:
        """分页查询作品列表。"""
        novels, total = await self.repo.list_for_b_end(
            search_key=params.search_key,
            status=params.status,
            category=params.category,
            date_range=params.date_range,
            page=params.page,
            page_size=params.page_size,
        )
        items = [novel_to_b_detail(n) for n in novels]
        return NovelListResponse(
            list=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
        )

    # ── 作品详情 ─────────────────────────────────────────
    async def get_detail(self, novel_id: int) -> BNovelDetail:
        """获取作品详情（含章节数）。"""
        novel = await self._get_novel(novel_id)
        detail = novel_to_b_detail(novel)
        from app.repositories.chapter_repo import ChapterRepository

        chapters = await ChapterRepository(self.session).list_by_novel(novel_id)
        detail.chapter_count = len(chapters)
        return detail

    # ── 新建/编辑作品 ───────────────────────────────────────
    async def submit_novel(
        self, body: NovelSubmitBody, novel_id: int | None = None
    ) -> BNovelDetail:
        """新建或编辑作品。"""
        if novel_id:
            novel = await self._get_novel(novel_id)
        else:
            novel = Novel(status="draft")
            self.session.add(novel)

        novel.title = body.title
        novel.author_id = int(body.author_id) if body.author_id else 0
        novel.category = body.category
        novel.cover = body.cover
        novel.intro = body.intro
        novel.flags = ",".join(body.flags) if body.flags else ""
        novel.price = body.price
        novel.author_remark = body.author_remark
        novel.is_completed = 1 if body.is_completed else 0
        await self.session.flush()
        await self.session.commit()
        if novel_id:
            await self._evict_novel_caches(novel_id)
        return novel_to_b_detail(novel)

    # ── 批量操作 ─────────────────────────────────────────
    async def batch_operate(
        self,
        ids: list[int],
        action: str,
        reason: str = "",
        comment: str = "",
    ) -> BatchOperateResponse:
        """批量操作作品（提审/通过/下架/重新上架/删除）。"""
        action_handlers = {
            "submit-audit": self._batch_submit_audit,
            "approve": self._batch_approve,
            "shelve": self._batch_shelve,
            "reshelve": self._batch_reshelve,
            "delete": self._batch_delete,
        }
        handler = action_handlers.get(action)
        if not handler:
            raise BizError(ErrorCode.PARAM_INVALID, f"不支持的操作: {action}")

        novels = await self.repo.get_by_ids(ids)
        novel_map = {n.id: n for n in novels}

        async def _run(nid: int) -> None:
            novel = novel_map.get(nid)
            if not novel:
                raise NotFoundError("作品不存在")
            await handler(novel, reason=reason, comment=comment)

        _, failed = await batch_execute(ids, _run, logger_name="novel_service.batch_operate")
        await self.session.commit()
        await self._evict_novel_caches_batch(ids)
        return BatchOperateResponse(success=len(failed) == 0, failed=failed or None)

    # ── 状态流转 ─────────────────────────────────────────
    async def transition(self, novel_id: int, target: str) -> BNovelDetail:
        """执行作品状态流转。"""
        novel = await self._get_novel(novel_id)
        NovelStateMachine.assert_transition(novel.status, target)
        novel.status = target
        now = _now_ms()
        if target == "published":
            novel.published_at = now
        elif target == "offline":
            novel.shelved_at = now
        await self.session.commit()
        await self._evict_novel_caches(novel_id)
        return novel_to_b_detail(novel)

    @staticmethod
    def _novel_cache_keys(novel_id: int) -> list[str]:
        """作品相关缓存键集合（C 端详情/章节 + 聚合/排行）。"""
        return [
            CacheKeys.book(novel_id),
            CacheKeys.chapters(novel_id),
            CacheKeys.HOME,
            CacheKeys.HOT_BOOKS,
            CacheKeys.FREE_LIMITED,
            CacheKeys.EDITOR_PICKS,
            CacheKeys.rank("hot"),
            CacheKeys.rank("follow"),
            CacheKeys.rank("ticket"),
            CacheKeys.rank("new"),
        ]

    async def _evict_novel_caches(self, novel_id: int) -> None:
        """状态/信息变更后失效 C 端书籍详情、章节列表与聚合/排行缓存。"""
        if not self.redis:
            return
        with contextlib.suppress(Exception):
            await self.redis.delete(*self._novel_cache_keys(novel_id))

    async def _evict_novel_caches_batch(self, novel_ids: list[int]) -> None:
        """批量失效多部作品相关缓存，合并为一次 redis delete。"""
        if not self.redis or not novel_ids:
            return
        keys: list[str] = []
        for nid in novel_ids:
            keys.extend(self._novel_cache_keys(nid))
        with contextlib.suppress(Exception):
            await self.redis.delete(*keys)

    # ── 批量提审 ─────────────────────────────────────────
    async def _batch_submit_audit(self, novel: Novel, **kwargs) -> None:
        NovelStateMachine.assert_transition(novel.status, "pending")
        novel.status = "pending"

    # ── 批量通过 ─────────────────────────────────────────
    async def _batch_approve(self, novel: Novel, **kwargs) -> None:
        NovelStateMachine.assert_transition(novel.status, "published")
        novel.status = "published"
        novel.published_at = _now_ms()

    # ── 批量下架 ─────────────────────────────────────────
    async def _batch_shelve(
        self, novel: Novel, *, reason: str = "", comment: str = "", **kwargs
    ) -> None:
        NovelStateMachine.assert_transition(novel.status, "offline")
        novel.status = "offline"
        novel.shelved_at = _now_ms()
        novel.offline_reason = reason
        novel.offline_remark = comment

    # ── 批量重新上架 ───────────────────────────────────────
    async def _batch_reshelve(self, novel: Novel, **kwargs) -> None:
        NovelStateMachine.assert_transition(novel.status, "published")
        novel.status = "published"

    # ── 批量删除 ─────────────────────────────────────────
    async def _batch_delete(self, novel: Novel, **kwargs) -> None:
        novel.deleted = 1

    # ── 内部工具 ─────────────────────────────────────────
    async def _get_novel(self, novel_id: int) -> Novel:
        novel = await self.repo.get_by_id(novel_id)
        if not novel or novel.deleted:
            raise NotFoundError("作品不存在")
        return novel

    async def batch_result(
        self, ids: list[int], action: str, reason: str = "", comment: str = ""
    ) -> BatchOperateResult:
        """返回通用批量操作结果（含 affected 计数）。"""
        resp = await self.batch_operate(ids, action, reason, comment)
        affected = len(ids) - (len(resp.failed) if resp.failed else 0)
        return BatchOperateResult(success=resp.success, affected=affected, failed=resp.failed)
