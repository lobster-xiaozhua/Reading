"""B 端用户管理服务。

提供读者列表查询（封禁/解封/等级调整等写操作预留）。
"""

import time

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import Reader
from app.schemas.b_end import UserListItem
from app.schemas.common import PagedResult

logger = structlog.get_logger(__name__)


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
        """查询读者列表，支持按用户名/昵称搜索。

        Args:
            page: 页码。
            page_size: 每页数量。
            search_key: 搜索关键词。

        Returns:
            分页的读者列表。
        """
        stmt = select(Reader).where(Reader.deleted == 0)
        if search_key:
            stmt = stmt.where(
                Reader.username.contains(search_key) | Reader.nickname.contains(search_key)
            )
        stmt = stmt.order_by(Reader.created_at.desc())

        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = (await self.session.execute(count_stmt)).scalar_one()
        result = await self.session.execute(stmt.offset((page - 1) * page_size).limit(page_size))
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
        """封禁或解封读者。

        Args:
            reader_id: 读者 ID。
            status: 0=封禁，1=解封。

        Returns:
            操作是否成功。
        """
        reader = await self.session.get(Reader, reader_id)
        if not reader:
            return False
        reader.deleted = 1 if status == 0 else 0
        reader.updated_at = int(time.time() * 1000)
        await self.session.commit()
        return True
