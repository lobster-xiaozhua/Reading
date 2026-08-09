"""审核仓储：审核记录 / 历史 / 敏感词库（§4.2.5）。"""

from datetime import datetime

from sqlalchemy import func, select

from app.models.audit import AuditHistory, AuditRecord, SensitiveWord
from app.repositories.base import BaseRepository, split_csv
from app.utils.time import now_ms as _now_ms


class AuditRepository(BaseRepository[AuditRecord]):
    model = AuditRecord

    async def list_queue(
        self, level: str = "all", page: int = 1, page_size: int = 20
    ) -> tuple[list[AuditRecord], int]:
        """分页查询待审核队列，可按级别筛选。"""
        stmt = select(AuditRecord).where(AuditRecord.status == "pending")
        if level and level != "all":
            stmt = stmt.where(AuditRecord.level.in_(split_csv(level)))
        stmt = stmt.order_by(AuditRecord.submitted_at.desc())
        return await self.paginate(stmt, page, page_size)

    async def get_by_ids(self, ids: list[int]) -> list[AuditRecord]:
        """批量获取审核记录（一次查询，避免循环内逐条 get）。"""
        if not ids:
            return []
        result = await self.session.execute(
            select(AuditRecord).where(AuditRecord.id.in_(ids))
        )
        return list(result.scalars().all())

    async def get_history(self, audit_record_id: int) -> list[AuditHistory]:
        """获取指定审核记录的操作历史。"""
        stmt = (
            select(AuditHistory)
            .where(AuditHistory.audit_record_id == audit_record_id)
            .order_by(AuditHistory.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def add_history(
        self,
        audit_record_id: int,
        operator_id: int,
        operator_name: str,
        result: str,
        comment: str,
        reject_reason: str = "",
        operator_ip: str = "",
        user_agent: str = "",
    ) -> AuditHistory:
        """添加一条审核操作历史记录。"""
        h = AuditHistory(
            audit_record_id=audit_record_id,
            operator_id=operator_id,
            operator_name=operator_name,
            result=result,
            comment=comment,
            reject_reason=reject_reason,
            operator_ip=operator_ip,
            user_agent=user_agent[:255],
            created_at=_now_ms(),
        )
        self.session.add(h)
        await self.session.flush()
        return h

    async def stats(self, level: str = "all") -> dict:
        """获取审核统计：待审核数/今日处理数/按级别分布。"""
        base = select(AuditRecord).where(AuditRecord.status == "pending")
        if level != "all":
            base = base.where(AuditRecord.level.in_(split_csv(level)))
        pending = (
            await self.session.execute(select(func.count()).select_from(base.subquery()))
        ).scalar_one()

        today_start = (
            int(datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).timestamp())
            * 1000
        )
        today_stmt = select(func.count()).where(
            AuditRecord.processed_at >= today_start,
            AuditRecord.status != "pending",
        )
        today_processed = (await self.session.execute(today_stmt)).scalar_one()

        by_level_stmt = (
            select(AuditRecord.level, func.count())
            .where(AuditRecord.status == "pending")
            .group_by(AuditRecord.level)
        )
        by_level = {r[0]: r[1] for r in (await self.session.execute(by_level_stmt)).all()}
        return {
            "pending_count": pending or 0,
            "today_processed": today_processed or 0,
            "by_level": by_level,
        }


class SensitiveWordRepository(BaseRepository[SensitiveWord]):
    model = SensitiveWord

    async def list_all(self) -> list[SensitiveWord]:
        """获取全部敏感词。"""
        result = await self.session.execute(select(SensitiveWord))
        return list(result.scalars().all())

    async def add(self, text: str, level: int, suggestion: str, version: str) -> SensitiveWord:
        """新增一条敏感词记录。"""
        word = SensitiveWord(
            text=text,
            level=level,
            suggestion=suggestion,
            lib_version=version,
        )
        self.session.add(word)
        await self.session.flush()
        return word

    async def remove(self, text: str, level: int | None = None) -> bool:
        """删除敏感词，返回是否成功删除。"""
        stmt = select(SensitiveWord).where(SensitiveWord.text == text)
        if level is not None:
            stmt = stmt.where(SensitiveWord.level == level)
        result = await self.session.execute(stmt)
        word = result.scalars().first()
        if word:
            await self.session.delete(word)
            await self.session.flush()
            return True
        return False

    async def current_version(self) -> str:
        """获取敏感词库当前版本号（count:max_updated_at 组合，任何增删都会变化）。

        避免仅用日期：同一天多次增删词时版本不变，多实例无法感知变更。
        """
        stmt = select(
            func.count(SensitiveWord.id),
            func.coalesce(func.max(SensitiveWord.updated_at), 0),
        )
        count, max_ts = (await self.session.execute(stmt)).one()
        return f"{count}:{max_ts}"
