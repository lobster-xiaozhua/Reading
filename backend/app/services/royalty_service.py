"""B 端稿费管理服务（§8.6）。

提供稿费列表、批量结算、标记提现。
结算状态流转走 ``RoyaltyStateMachine`` 校验。
"""

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.novel import Novel
from app.models.royalty import RoyaltyDetail
from app.models.user import Author
from app.repositories.royalty_repo import RoyaltyRepository
from app.schemas.common import BatchOperateResult
from app.schemas.royalty import (
    RoyaltyDetailItem,
    RoyaltyListResponse,
    RoyaltyStats,
)

logger = structlog.get_logger(__name__)


class RoyaltyService:
    """B 端稿费管理服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = RoyaltyRepository(session)

    # ── 稿费列表 ─────────────────────────────────────────
    async def list_royalties(
        self,
        month: str | None = None,
        status: str = "all",
        author_name: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> RoyaltyListResponse:
        """分页查询稿费列表（含统计汇总）。

        Args:
            month: 结算月份。
            status: 状态过滤（all/pending/settled/withdrawn）。
            author_name: 作者名搜索。
            page: 页码。
            page_size: 每页数量。

        Returns:
            稿费列表及统计。
        """
        details, _ = await self.repo.list_for_b_end(
            month=month,
            status=status,
            author_name=author_name,
            page=page,
            page_size=page_size,
        )
        # 补全作者名
        author_ids = list({d.author_id for d in details if d.author_id})
        author_map = await self._get_author_map(author_ids)
        # 补全作品标题
        novel_ids = list({d.novel_id for d in details if d.novel_id})
        novel_map = await self._get_novel_map(novel_ids)

        items: list[RoyaltyDetailItem] = []
        for d in details:
            items.append(
                RoyaltyDetailItem(
                    id=str(d.id),
                    month=d.month,
                    novel_id=str(d.novel_id),
                    novel_title=novel_map.get(d.novel_id, ""),
                    author_id=str(d.author_id),
                    author_name=author_map.get(d.author_id, ""),
                    chapter_count=d.chapter_count,
                    word_count=d.word_count,
                    contract_type=d.contract_type,
                    rate=float(d.rate) if d.rate else None,
                    subscription_revenue=float(d.subscription_revenue),
                    amount=float(d.amount),
                    status=d.status,
                    settled_at=d.settled_at or None,
                    withdrawn_at=d.withdrawn_at or None,
                )
            )

        # 统计汇总（基于当前查询结果集）
        stats = self._calc_stats(items)
        return RoyaltyListResponse(items=items, stats=stats)

    # ── 批量结算 ─────────────────────────────────────────
    async def batch_settle(self, ids: list[int]) -> BatchOperateResult:
        """批量结算稿费（pending -> settled）。

        Args:
            ids: 稿费记录 ID 列表。

        Returns:
            批量操作结果。
        """
        # 预校验状态
        await self._assert_status(ids, "pending")
        affected = await self.repo.batch_settle(ids)
        await self.session.commit()
        return BatchOperateResult(success=True, affected=affected)

    # ── 标记提现 ─────────────────────────────────────────
    async def mark_withdrawn(self, ids: list[int]) -> BatchOperateResult:
        """标记稿费已提现（settled -> withdrawn）。

        Args:
            ids: 稿费记录 ID 列表。

        Returns:
            批量操作结果。
        """
        await self._assert_status(ids, "settled")
        affected = await self.repo.mark_withdrawn(ids)
        await self.session.commit()
        return BatchOperateResult(success=True, affected=affected)

    # ── 内部工具 ─────────────────────────────────────────
    async def _get_author_map(self, author_ids: list[int]) -> dict[int, str]:
        if not author_ids:
            return {}
        stmt = select(Author.id, Author.pen_name).where(Author.id.in_(author_ids))
        rows = (await self.session.execute(stmt)).all()
        return {r[0]: r[1] for r in rows}

    async def _get_novel_map(self, novel_ids: list[int]) -> dict[int, str]:
        if not novel_ids:
            return {}
        stmt = select(Novel.id, Novel.title).where(Novel.id.in_(novel_ids))
        rows = (await self.session.execute(stmt)).all()
        return {r[0]: r[1] for r in rows}

    async def _assert_status(self, ids: list[int], expected: str) -> None:
        """预校验：所有记录必须处于 expected 状态，否则抛出业务异常。

        Args:
            ids: 稿费记录 ID 列表
            expected: 期望的状态

        Raises:
            BizError: 存在状态不符合预期的记录
        """
        if not ids:
            return
        stmt = select(RoyaltyDetail.id, RoyaltyDetail.status).where(
            RoyaltyDetail.id.in_(ids)
        )
        rows = (await self.session.execute(stmt)).all()
        invalid_ids = [str(rid) for rid, status in rows if status != expected]
        if invalid_ids:
            from app.core.exceptions import BizError, ErrorCode
            raise BizError(
                ErrorCode.NOVEL_STATUS_INVALID,
                f"记录 {', '.join(invalid_ids)} 状态不是 {expected}，无法执行操作",
            )

    @staticmethod
    def _calc_stats(items: list[RoyaltyDetailItem]) -> RoyaltyStats:
        """基于结果集实时聚合统计。"""
        pending_count = settled_count = withdrawn_count = 0
        pending_amount = settled_amount = withdrawn_amount = 0.0
        monthly_total = 0.0
        for item in items:
            monthly_total += item.amount
            if item.status == "pending":
                pending_count += 1
                pending_amount += item.amount
            elif item.status == "settled":
                settled_count += 1
                settled_amount += item.amount
            elif item.status == "withdrawn":
                withdrawn_count += 1
                withdrawn_amount += item.amount
        return RoyaltyStats(
            pending_count=pending_count,
            pending_amount=pending_amount,
            settled_count=settled_count,
            settled_amount=settled_amount,
            withdrawn_count=withdrawn_count,
            withdrawn_amount=withdrawn_amount,
            monthly_total=monthly_total,
        )
