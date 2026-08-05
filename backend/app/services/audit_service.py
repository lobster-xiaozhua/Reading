"""B 端内容审核服务（§8.5）。

提供审核队列、审核历史、提交审核结果。
审核通过/驳回时联动章节状态流转。
"""

import json
import time

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.audit import AuditRecord
from app.models.novel import Chapter, Novel
from app.repositories.audit_repo import AuditRepository
from app.schemas.b_end import (
    AuditHistoryItem,
    AuditItem,
    AuditQueueResponse,
    AuditQueueStats,
    AuditSubmitBody,
    AuditSubmitResult,
    RejectReason,
    SensitiveHit,
)
from app.schemas.enums import AuditResult
from app.utils.batch import batch_execute
from app.utils.state_machine import ChapterStateMachine

logger = structlog.get_logger(__name__)


class AuditService:
    """B 端审核服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = AuditRepository(session)

    # ── 审核队列 ─────────────────────────────────────────
    async def get_queue(self, level: str = "all") -> AuditQueueResponse:
        """获取审核队列（含待审统计）。

        Args:
            level: 审核级别过滤（all/1/2/3）。

        Returns:
            审核队列及统计数据。
        """
        records, _ = await self.repo.list_queue(level=level, page=1, page_size=100)
        stats_data = await self.repo.stats(level=level)
        stats = AuditQueueStats(
            pending_count=stats_data.get("pending_count", 0),
            today_processed=stats_data.get("today_processed", 0),
            by_level=stats_data.get("by_level", {}),
        )
        items = await self._records_to_items(records)
        return AuditQueueResponse(items=items, stats=stats)

    # ── 审核历史 ─────────────────────────────────────────
    async def get_history(self, audit_id: int) -> list[AuditHistoryItem]:
        """获取指定审核项的操作历史。

        Args:
            audit_id: 审核记录 ID。

        Returns:
            审核历史列表。
        """
        histories = await self.repo.get_history(audit_id)
        return [
            AuditHistoryItem(
                id=str(h.id),
                operator_name=h.operator_name,
                result=h.result,
                comment=h.comment,
                reject_reason=h.reject_reason,
                created_at=h.created_at,
            )
            for h in histories
        ]

    # ── 提交审核 ─────────────────────────────────────────
    async def submit_audit(
        self, body: AuditSubmitBody, operator_id: int, operator_name: str
    ) -> AuditSubmitResult:
        """提交审核结果（通过/驳回），联动章节状态流转。

        Args:
            body: 审核提交数据。
            operator_id: 操作人 ID。
            operator_name: 操作人姓名。

        Returns:
            审核提交结果（含下一条待审项 ID）。
        """

        async def _process_one(aid: str) -> None:
            audit_id = int(aid)
            record = await self.repo.get_by_id(audit_id)
            if not record or record.status != "pending":
                raise NotFoundError("审核项不存在或已处理")
            await self._process_audit(
                record,
                body.result,
                body.comment,
                body.reject_reason,
                operator_id,
                operator_name,
            )
            nonlocal next_id
            if not next_id:
                next_id = await self._get_next_id(audit_id)

        next_id: str | None = None
        _, failed = await batch_execute(
            body.ids, _process_one, logger_name="audit_service.submit_audit"
        )
        await self.session.commit()
        return AuditSubmitResult(
            success=len(failed) == 0,
            next_id=next_id,
            failed=failed or None,
        )

    # ── 内部工具 ─────────────────────────────────────────
    async def _process_audit(
        self,
        record: AuditRecord,
        result: AuditResult,
        comment: str,
        reject_reason: RejectReason | None,
        operator_id: int,
        operator_name: str,
    ) -> None:
        now = int(time.time() * 1000)
        record.status = result.value
        record.operator_id = operator_id
        record.operator_name = operator_name
        record.comment = comment
        record.reject_reason = reject_reason.value if reject_reason else ""
        record.processed_at = now

        # 写审核历史
        await self.repo.add_history(
            record.id,
            operator_id,
            operator_name,
            result.value,
            comment,
            reject_reason.value if reject_reason else "",
        )

        # 联动章节状态
        if record.target_type == "chapter":
            chapter = await self.session.get(Chapter, record.target_id)
            if chapter:
                if result == AuditResult.APPROVE:
                    ChapterStateMachine.assert_transition(chapter.status, "published")
                    chapter.status = "published"
                    chapter.published_at = now
                elif result == AuditResult.REJECT:
                    ChapterStateMachine.assert_transition(chapter.status, "draft")
                    chapter.status = "draft"

    async def _get_next_id(self, current_id: int) -> str | None:
        """获取下一条待审项 ID。"""
        from sqlalchemy import select

        stmt = (
            select(AuditRecord.id)
            .where(AuditRecord.status == "pending", AuditRecord.id != current_id)
            .order_by(AuditRecord.submitted_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        nid = result.scalars().first()
        return str(nid) if nid else None

    async def _records_to_items(self, records: list[AuditRecord]) -> list[AuditItem]:
        """批量转换审核记录为展示项（消除 N+1 查询）。"""
        if not records:
            return []

        # ── 1. 收集全部需要查询的 ID ───────────────────────
        novel_ids: set[int] = set()
        chapter_ids: set[int] = set()
        chapter_records: list[AuditRecord] = []  # 需要查章节的记录

        for r in records:
            if r.target_type == "novel":
                novel_ids.add(r.target_id)
            elif r.target_type == "chapter":
                chapter_ids.add(r.target_id)
                chapter_records.append(r)

        # ── 2. 批量查询 Novel ───────────────────────────────
        novels: dict[int, Novel] = {}
        if novel_ids:
            stmt = select(Novel).where(Novel.id.in_(novel_ids))
            result = await self.session.execute(stmt)
            for n in result.scalars().all():
                novels[n.id] = n

        # ── 3. 批量查询 Chapter + 级联 Novel ───────────────
        chapters: dict[int, Chapter] = {}
        if chapter_ids:
            stmt = select(Chapter).where(Chapter.id.in_(chapter_ids))
            result = await self.session.execute(stmt)
            for c in result.scalars().all():
                chapters[c.id] = c
                novel_ids.add(c.novel_id)  # 章节关联的小说也需要加载

            # 补充查询章节关联的小说（排除已加载的）
            missing_novel_ids = novel_ids - novels.keys()
            if missing_novel_ids:
                stmt = select(Novel).where(Novel.id.in_(missing_novel_ids))
                result = await self.session.execute(stmt)
                for n in result.scalars().all():
                    novels[n.id] = n

        # ── 4. 组装结果 ────────────────────────────────────
        return [self._record_to_item(r, novels, chapters) for r in records]

    def _record_to_item(
        self,
        record: AuditRecord,
        novels: dict[int, Novel],
        chapters: dict[int, Chapter],
    ) -> AuditItem:
        """单条记录转换（使用预加载的字典，无额外查询）。"""
        target_title = ""
        chapter_title = ""
        novel_title = ""
        author = ""
        content = ""
        word_count = 0
        if record.target_type == "novel":
            novel = novels.get(record.target_id)
            if novel:
                target_title = novel.title
                novel_title = novel.title
                author = novel.author_name
        elif record.target_type == "chapter":
            chapter = chapters.get(record.target_id)
            if chapter:
                target_title = chapter.title
                chapter_title = chapter.title
                content = chapter.content_text or chapter.content or ""
                word_count = chapter.word_count or 0
                novel = novels.get(chapter.novel_id)
                if novel:
                    novel_title = novel.title
                    author = novel.author_name

        hits: list[SensitiveHit] = []
        if record.sensitive_hits:
            try:
                hit_data = json.loads(record.sensitive_hits)
                for h in hit_data:
                    hits.append(
                        SensitiveHit(
                            text=h.get("text") or h.get("word", ""),
                            level=h.get("level", 3),
                            offset=h.get("offset", 0),
                            suggestion=h.get("suggestion", ""),
                        )
                    )
            except Exception:
                logger.debug("敏感词快照解析失败 audit_id=%s", record.id, exc_info=True)

        return AuditItem(
            id=str(record.id),
            target_type=record.target_type,
            target_id=str(record.target_id),
            level=record.level,
            status=record.status,
            target_title=target_title,
            chapter_title=chapter_title,
            novel_title=novel_title,
            author=author,
            content=content,
            word_count=word_count,
            sensitive_hits=hits,
            submitted_at=record.submitted_at,
            processed_at=record.processed_at,
        )
