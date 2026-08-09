"""B 端内容审核服务（§8.5）。

提供审核队列、审核历史、提交审核结果。
审核通过/驳回时联动章节状态流转。
"""

import json

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.audit import AuditRecord
from app.models.novel import Chapter, Novel
from app.repositories.audit_repo import AuditRepository
from app.repositories.novel_repo import NovelRepository
from app.schemas.b_end import (
    AuditHistoryItem,
    AuditItem,
    AuditQueueResponse,
    AuditQueueStats,
    AuditSubmitBody,
    AuditSubmitResult,
    SensitiveHit,
)
from app.schemas.enums import AuditResult
from app.utils.time import now_ms as _now_ms

logger = structlog.get_logger(__name__)


class AuditService:
    """B 端审核服务。"""

    def __init__(self, session: AsyncSession, redis_client=None) -> None:
        self.session = session
        self.redis = redis_client
        self.repo = AuditRepository(session)

    # ── 审核队列 ─────────────────────────────────────────
    async def get_queue(self, level: str = "all") -> AuditQueueResponse:
        """获取审核队列（含待审统计）。"""
        records, _ = await self.repo.list_queue(level=level, page=1, page_size=100)
        stats_data = await self.repo.stats(level=level)
        stats = AuditQueueStats(
            pending_count=stats_data.get("pending_count", 0),
            today_processed=stats_data.get("today_processed", 0),
            by_level=stats_data.get("by_level", {}),
        )
        items = await self._records_to_items(records)
        return AuditQueueResponse(list=items, stats=stats)

    async def _records_to_items(self, records: list[AuditRecord]) -> list[AuditItem]:
        """批量转换审核记录为队列项（批量加载关联数据避免 N+1）。"""
        if not records:
            return []
        novel_ids = [int(r.target_id) for r in records if r.target_type == "novel"]
        chapter_ids = [int(r.target_id) for r in records if r.target_type == "chapter"]
        novel_map = await self._load_novels(novel_ids)
        chapter_map: dict[int, Chapter] = {}
        if chapter_ids:
            rows = list((await self.session.execute(
                select(Chapter).where(Chapter.id.in_(chapter_ids))
            )).scalars().all())
            chapter_map = {int(c.id): c for c in rows}
            chapter_novel_ids = [int(c.novel_id) for c in rows if getattr(c, "novel_id", None)]
            novel_map.update(await self._load_novels(chapter_novel_ids))

        return [
            AuditItem(
                id=str(r.id),
                target_type=r.target_type,
                target_id=str(r.target_id),
                level=r.level,
                status=r.status,
                **self._target_titles(r, novel_map, chapter_map),
                content="",
                word_count=0,
                sensitive_hits=self._parse_sensitive_hits(r.sensitive_hits),
                submitted_at=r.submitted_at or 0,
                processed_at=r.processed_at or 0,
            )
            for r in records
        ]

    async def _load_novels(self, novel_ids: list[int]) -> dict[int, Novel]:
        """批量加载小说，返回 {novel_id: Novel}。"""
        if not novel_ids:
            return {}
        novels = await NovelRepository(self.session).get_by_ids(novel_ids)
        return {int(n.id): n for n in novels}

    @staticmethod
    def _target_titles(
        record: AuditRecord,
        novel_map: dict[int, Novel],
        chapter_map: dict[int, Chapter],
    ) -> dict:
        """构建审核目标的展示标题（target_title / chapter_title / novel_title / author）。"""
        target_id = int(record.target_id)
        if record.target_type == "novel":
            novel = novel_map.get(target_id)
            return {
                "target_title": novel.title if novel else "",
                "chapter_title": "",
                "novel_title": novel.title if novel else "",
                "author": novel.author_name if novel else "",
            }
        if record.target_type == "chapter":
            chapter = chapter_map.get(target_id)
            if chapter is None:
                return {"target_title": "", "chapter_title": "", "novel_title": "", "author": ""}
            novel = novel_map.get(int(getattr(chapter, "novel_id", None) or 0))
            return {
                "target_title": chapter.title,
                "chapter_title": chapter.title,
                "novel_title": novel.title if novel else "",
                "author": novel.author_name if novel else "",
            }
        return {"target_title": "", "chapter_title": "", "novel_title": "", "author": ""}

    @staticmethod
    def _parse_sensitive_hits(raw: str) -> list[SensitiveHit]:
        """解析敏感词命中 JSON，格式非法时返回空列表。"""
        if not raw:
            return []
        try:
            parsed = json.loads(raw)
        except (ValueError, TypeError):
            return []
        return [SensitiveHit(text=h.get("text", ""), level=h.get("level", 3)) for h in parsed]

    async def get_history(self, audit_record_id: int) -> list[AuditHistoryItem]:
        """获取指定审核记录的操作历史。"""
        records = await self.repo.get_history(audit_record_id)
        return [
            AuditHistoryItem(
                id=str(r.id),
                operator_name=r.operator_name,
                result=r.result,
                comment=r.comment,
                reject_reason=r.reject_reason,
                created_at=r.created_at,
            )
            for r in records
        ]

    async def get_content(self, audit_record_id: int) -> AuditSubmitResult:
        """获取审核记录内容。"""
        record = await self.repo.get_by_id(audit_record_id)
        if not record:
            raise NotFoundError("审核记录不存在")
        return AuditSubmitResult(
            success=True,
            next_id=await self._get_next_id(audit_record_id),
        )

    async def submit_audit(
        self,
        body: AuditSubmitBody,
        operator_id: int,
        operator_name: str,
        operator_ip: str = "",
        user_agent: str = "",
    ) -> AuditSubmitResult:
        """提交审核（批量处理，批量加载避免循环内逐条查询）。"""
        record_ids, failed = self._parse_ids(body.ids)
        pending, classify_failed = await self._classify_records(record_ids)
        failed.extend(classify_failed)

        chapters = await self._load_chapter_targets(pending)
        for record in pending:
            await self._process_single(
                record,
                body.result,
                body.comment or "",
                body.reject_reason,
                operator_id,
                operator_name,
                operator_ip,
                user_agent,
                chapters,
            )
        await self.session.flush()
        await self.session.commit()
        next_id = await self._next_pending_id(body.ids) if not failed and body.ids else None
        return AuditSubmitResult(success=len(failed) == 0, next_id=next_id, failed=failed or None)

    @staticmethod
    def _parse_ids(ids: list[str]) -> tuple[list[int], list[dict]]:
        """解析审核 ID 列表，返回 (有效ID, 无效项失败列表)。"""
        parsed: list[int] = []
        failed: list[dict] = []
        for s in ids:
            try:
                parsed.append(int(s))
            except (ValueError, TypeError):
                failed.append({"id": s, "reason": "无效ID"})
        return parsed, failed

    async def _classify_records(
        self, record_ids: list[int]
    ) -> tuple[list[AuditRecord], list[dict]]:
        """批量加载审核记录并按状态分类，返回 (待处理, 失败列表)。"""
        records = await self.repo.get_by_ids(record_ids)
        record_map = {r.id: r for r in records}
        pending: list[AuditRecord] = []
        failed: list[dict] = []
        for rid in record_ids:
            record = record_map.get(rid)
            if not record:
                failed.append({"id": str(rid), "reason": "记录不存在"})
            elif record.status != "pending":
                failed.append({"id": str(rid), "reason": "已处理"})
            else:
                pending.append(record)
        return pending, failed

    async def _next_pending_id(self, ids: list[str]) -> str | None:
        """获取批量处理首条记录之后的下一个待审 ID。"""
        try:
            first_id = int(ids[0])
        except (ValueError, TypeError):
            return None
        return await self._get_next_id(first_id)

    async def _load_chapter_targets(self, pending: list[AuditRecord]) -> dict[int, Chapter]:
        """批量加载待处理章节审核目标，返回 {chapter_id: Chapter}。"""
        chapter_ids = [
            int(r.target_id) for r in pending if r.target_type == "chapter"
        ]
        if not chapter_ids:
            return {}
        rows = list((await self.session.execute(
            select(Chapter).where(Chapter.id.in_(chapter_ids))
        )).scalars().all())
        return {c.id: c for c in rows}

    async def _process_single(
        self,
        record: AuditRecord,
        result: AuditResult,
        comment: str,
        reject_reason,
        operator_id: int,
        operator_name: str,
        operator_ip: str,
        user_agent: str,
        chapters: dict[int, Chapter],
    ) -> None:
        now = _now_ms()
        record.status = result.value
        record.operator_id = operator_id
        record.operator_name = operator_name
        record.comment = comment
        record.reject_reason = reject_reason.value if reject_reason else ""
        record.processed_at = now
        await self.repo.add_history(
            record.id,
            operator_id,
            operator_name,
            result.value,
            comment,
            reject_reason.value if reject_reason else "",
            operator_ip,
            user_agent,
        )
        chapter = chapters.get(int(record.target_id)) if record.target_type == "chapter" else None
        if chapter is None:
            return
        if result.value == "approve":
            chapter.status = "published"
            chapter.published_at = now
        elif result.value == "reject":
            chapter.status = "draft"
        self.session.add(chapter)

    async def _get_next_id(self, record_id: int) -> str | None:
        """获取队列中下一个待审记录 ID。"""
        stmt = (
            select(AuditRecord.id)
            .where(AuditRecord.id > record_id, AuditRecord.status == "pending")
            .order_by(AuditRecord.id.asc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        next_id = result.scalar_one_or_none()
        return str(next_id) if next_id else None
