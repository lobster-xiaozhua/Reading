"""数据聚合查询工具：跨服务复用的计数/求和封装。"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


async def count_rows(session: AsyncSession, model, *filters) -> int:
    """按筛选条件统计行数。"""
    stmt = select(func.count()).select_from(model).where(*filters)
    return (await session.execute(stmt)).scalar_one()


async def sum_column(session: AsyncSession, model, column, *filters) -> float:
    """按筛选条件对指定列求和，无匹配行返回 0.0。"""
    stmt = select(func.coalesce(func.sum(column), 0)).where(*filters)
    return float((await session.execute(stmt)).scalar_one())
