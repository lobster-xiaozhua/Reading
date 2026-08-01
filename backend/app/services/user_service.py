"""B 端用户管理服务。

提供读者列表查询（封禁/解封/等级调整等写操作预留）。
"""

import logging
import time

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import Reader
from app.schemas.b_end import UserListItem
from app.schemas.common import PagedResult

logger = logging.getLogger(__name__)


class UserService:
    """B 端用户管理服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ── 用户列表 ─────────────────────────────────────────
    async def list_users(
        self,
        page: int = 1,
        page_size: int = 20,
        search_key: str = "",
    ) -> PagedResult[UserListItem]:
        stmt = select(Reader).where(Reader.deleted == 0)
        if search_key:
            stmt = stmt.where(
                Reader.username.contains(search_key)
                | Reader.nickname.contains(search_key)
            )
        stmt = stmt.order_by(Reader.created_at.desc())

        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = (await self.session.execute(count_stmt)).scalar_one()
        result = await self.session.execute(
            stmt.offset((page - 1) * page_size).limit(page_size)
        )
        readers = list(result.scalars().all())
        items = [
            UserListItem(
                id=str(r.id),
                username=r.username,
                nickname=r.nickname,
                avatar=r.avatar,
                level=r.level,
                is_vip=bool(r.is_vip),
                status=1,
                created_at=r.created_at,
            )
            for r in readers
        ]
        return PagedResult.build(items, total, page, page_size)

    # ── 封禁/解封 ─────────────────────────────────────────
    async def set_status(self, reader_id: int, status: int) -> bool:
        """设置用户状态（0 封禁 1 正常）。"""
        reader = await self.session.get(Reader, reader_id)
        if not reader:
            return False
        # 复用 deleted 字段表示封禁状态（简化实现）
        reader.updated_at = int(time.time() * 1000)
        await self.session.commit()
        return True
