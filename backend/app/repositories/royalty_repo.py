"""稿费仓储（§4.2.6）。"""

import time

from sqlalchemy import select

from app.models.royalty import RoyaltyDetail
from app.repositories.base import BaseRepository


class RoyaltyRepository(BaseRepository[RoyaltyDetail]):
    model = RoyaltyDetail

    async def list_for_b_end(
        self,
        *,
        month: str | None = None,
        status: str = "all",
        author_name: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[RoyaltyDetail], int]:
        """B 端分页查询稿费记录，按月/状态/作者筛选。"""
        stmt = select(RoyaltyDetail)
        if month:
            stmt = stmt.where(RoyaltyDetail.month == month)
        if status and status != "all":
            stmt = stmt.where(RoyaltyDetail.status == status)
        stmt = stmt.order_by(RoyaltyDetail.created_at.desc())
        return await self.paginate(stmt, page, page_size)

    async def batch_settle(self, ids: list[int]) -> int:
        """批量结算稿费，返回成功结算的条数。"""
        if not ids:
            return 0
        stmt = select(RoyaltyDetail).where(
            RoyaltyDetail.id.in_(ids), RoyaltyDetail.status == "pending"
        )
        result = await self.session.execute(stmt)
        items = list(result.scalars().all())
        now = int(time.time() * 1000)
        for r in items:
            r.status = "settled"
            r.settled_at = now
        await self.session.flush()
        return len(items)

    async def mark_withdrawn(self, ids: list[int]) -> int:
        """批量标记稿费为已提现，返回成功标记的条数。"""
        if not ids:
            return 0
        stmt = select(RoyaltyDetail).where(
            RoyaltyDetail.id.in_(ids), RoyaltyDetail.status == "settled"
        )
        result = await self.session.execute(stmt)
        items = list(result.scalars().all())
        now = int(time.time() * 1000)
        for r in items:
            r.status = "withdrawn"
            r.withdrawn_at = now
        await self.session.flush()
        return len(items)
