"""Repository 基类：泛型数据访问（SQLAlchemy 2.0 异步）。"""

from typing import Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base

ModelT = TypeVar("ModelT", bound=Base)


def split_csv(value: str) -> list[str]:
    """将逗号分隔的多选筛选参数拆分为值列表（过滤空项）。"""
    return [v for v in (item.strip() for item in value.split(",")) if v]


class BaseRepository(Generic[ModelT]):
    """泛型仓储基类。

    子类设置 ``model`` 类属性，复用通用 CRUD 与分页能力。
    """

    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, id: int) -> ModelT | None:
        """根据主键 ID 获取单个对象。"""
        return await self.session.get(self.model, id)

    async def add(self, obj: ModelT) -> ModelT:
        """新增对象并 flush 取回主键。"""
        self.session.add(obj)
        await self.session.flush()
        return obj

    async def flush(self) -> None:
        """立即 flush 当前会话中的待持久化操作。"""
        await self.session.flush()

    async def paginate(
        self,
        stmt,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[ModelT], int]:
        """标准分页查询（OFFSET-based），返回 (items, total)。

        适用于中小数据量。
        """
        count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
        total = (await self.session.execute(count_stmt)).scalar_one()
        result = await self.session.execute(
            stmt.offset((page - 1) * page_size).limit(page_size)
        )
        return list(result.scalars().all()), total
