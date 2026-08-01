"""B 端工作台服务（§8.2）。

提供 KPI 卡片数据与字数趋势。
KPI 走 Redis 计数器，趋势走按日聚合查询。
"""

import logging
import time
from datetime import date, timedelta

import redis.asyncio as redis
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import CacheKeys
from app.models.novel import Chapter, Novel
from app.models.user import Author, Reader
from app.schemas.b_end import WorkbenchKpi
from app.schemas.chart import TrendPoint, WordCountTrend

logger = logging.getLogger(__name__)

_TTL_KPI = 300  # 5 分钟


class WorkbenchService:
    """B 端工作台服务。"""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        self.session = session
        self.redis = redis_client

    # ── KPI 卡片 ─────────────────────────────────────────
    async def get_kpi(self) -> WorkbenchKpi:
        cached = await self.redis.get(CacheKeys.WORKBENCH_KPI)
        if cached:
            return WorkbenchKpi.model_validate_json(cached)

        total_novels = await self._count(Novel, Novel.deleted == 0)
        published = await self._count(
            Novel, Novel.deleted == 0, Novel.status == "published"
        )
        pending = await self._count(Novel, Novel.deleted == 0, Novel.status == "pending")
        total_authors = await self._count(Author, Author.deleted == 0)
        total_readers = await self._count(Reader, Reader.deleted == 0)

        kpi = WorkbenchKpi(
            total_novels=total_novels,
            published_novels=published,
            pending_audit=pending,
            total_authors=total_authors,
            total_readers=total_readers,
            today_revenue=0.0,
        )
        try:
            await self.redis.set(
                CacheKeys.WORKBENCH_KPI, kpi.model_dump_json(by_alias=True), ex=_TTL_KPI
            )
        except Exception:
            logger.warning("KPI 缓存写入失败", exc_info=True)
        return kpi

    # ── 字数趋势 ─────────────────────────────────────────
    async def get_word_count_trend(self, days: int = 30) -> WordCountTrend:
        start_date = date.today() - timedelta(days=days)
        start_ts = int(time.mktime(start_date.timetuple())) * 1000
        stmt = (
            select(Chapter.published_at, Chapter.word_count)
            .where(
                Chapter.deleted == 0,
                Chapter.status == "published",
                Chapter.published_at >= start_ts,
            )
            .order_by(Chapter.published_at)
        )
        rows = (await self.session.execute(stmt)).all()

        # 按日聚合（跨数据库兼容，避免 SQLite/MySQL 日期函数差异）
        daily_map: dict[str, int] = {}
        for ts, words in rows:
            if not ts:
                continue
            day = date.fromtimestamp(ts / 1000).isoformat()
            daily_map[day] = daily_map.get(day, 0) + int(words or 0)

        daily: list[TrendPoint] = []
        cumulative: list[TrendPoint] = []
        running = 0
        for day in sorted(daily_map):
            words = daily_map[day]
            daily.append(TrendPoint(date=day, value=words))
            running += words
            cumulative.append(TrendPoint(date=day, value=running))
        return WordCountTrend(daily=daily, cumulative=cumulative)

    # ── 内部工具 ─────────────────────────────────────────
    async def _count(self, model, *filters) -> int:
        stmt = select(func.count()).select_from(model).where(*filters)
        return (await self.session.execute(stmt)).scalar_one()
