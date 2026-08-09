"""B 端工作台服务（§8.2）。

提供 KPI 卡片数据与字数趋势。
KPI 走 Redis 计数器，趋势走按日聚合查询。
"""

from datetime import date, datetime, timedelta

import redis.asyncio as redis
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import CacheKeys
from app.models.interaction import Comment, RewardRecord
from app.models.novel import Chapter, Novel
from app.models.user import Author, Reader
from app.schemas.b_end import (
    DashboardResponse,
    HttpPathMetric,
    RedisCommandMetric,
    RedisPatternMetric,
    SlowItem,
    SystemMetricsSnapshot,
    WorkbenchKpi,
)
from app.schemas.chart import TrendPoint, WordCountTrend
from app.utils.query import count_rows, sum_column
from app.utils.time import ts_to_day

logger = structlog.get_logger(__name__)

_TTL_KPI = 300  # 5 分钟


def _today_start_ms() -> int:
    """今日起始毫秒时间戳（每次计算，避免服务跨天运行后统计窗口过期）。"""
    now = datetime.now()
    return int(datetime(now.year, now.month, now.day).timestamp() * 1000)


class WorkbenchService:
    """B 端工作台服务。"""

    def __init__(self, session: AsyncSession, redis_client: redis.Redis) -> None:
        self.session = session
        self.redis = redis_client

    # ── KPI 卡片 ─────────────────────────────────────────
    async def get_kpi(self) -> WorkbenchKpi:
        """获取工作台 KPI 卡片数据（Cache-Aside）。"""
        cached = await self.redis.get(CacheKeys.WORKBENCH_KPI)
        if cached:
            return WorkbenchKpi.model_validate_json(cached)

        total_novels = await self._count(Novel, Novel.deleted == 0)
        published = await self._count(Novel, Novel.deleted == 0, Novel.status == "published")
        pending = await self._count(Novel, Novel.deleted == 0, Novel.status == "pending")
        total_authors = await self._count(Author, Author.deleted == 0)
        total_readers = await self._count(Reader, Reader.deleted == 0)

        today_revenue = await self._sum(
            RewardRecord, RewardRecord.amount, RewardRecord.created_at >= _today_start_ms()
        )

        kpi = WorkbenchKpi(
            total_novels=total_novels,
            published_novels=published,
            pending_audit=pending,
            total_authors=total_authors,
            total_readers=total_readers,
            today_revenue=float(today_revenue or 0),
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
        """获取字数增长趋势（按日聚合）。"""
        start_date = date.today() - timedelta(days=days)
        start_ts = int(datetime.combine(start_date, datetime.min.time()).timestamp() * 1000)
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
            day = ts_to_day(ts)
            if day:
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

    # ── 内容概览 ─────────────────────────────────────────
    async def get_overviews(self) -> list[dict]:
        """获取内容概览（作品/章节/待审核/今日打赏/今日评论统计）。"""
        total_novels = await self._count(Novel, Novel.deleted == 0)
        total_chapters = await self._count(Chapter, Chapter.deleted == 0)
        pending_audit = await self._count(Novel, Novel.deleted == 0, Novel.status == "pending")
        today_rewards = await self._count(RewardRecord, RewardRecord.created_at >= _today_start_ms())
        today_comments = await self._count(Comment, Comment.created_at >= _today_start_ms())

        return [
            {"key": "totalNovels", "label": "作品总数", "value": total_novels, "icon": "book"},
            {"key": "totalChapters", "label": "章节总数", "value": total_chapters, "icon": "file"},
            {"key": "pendingAudit", "label": "待审核", "value": pending_audit, "icon": "clock"},
            {"key": "todayRewards", "label": "今日打赏", "value": today_rewards, "icon": "star"},
            {
                "key": "todayComments",
                "label": "今日评论",
                "value": today_comments,
                "icon": "message",
            },
        ]

    # ── 仪表盘聚合 ───────────────────────────────────────
    async def get_dashboard(self, days: int = 30) -> DashboardResponse:
        """一次返回 KPI + 概览 + 趋势数据，减少网络往返。"""
        kpi = await self.get_kpi()
        overviews = await self.get_overviews()
        trend = await self.get_word_count_trend(days)
        return DashboardResponse(
            kpi=kpi,
            overviews=overviews,
            trend=[t.model_dump() for t in trend.daily] if trend.daily else [],
        )

    # ── 系统可观测性 ─────────────────────────────────────
    async def get_system_metrics(self) -> SystemMetricsSnapshot:
        """聚合进程内系统可观测性指标（统一控制面板系统指标区）。"""
        from app.core import metrics as metric_store

        counts, durations, errors = metric_store.get_metrics()
        total = sum(counts.values())
        error_total = sum(errors.values())
        all_durations = [d for ds in durations.values() for d in ds]
        avg_duration = sum(all_durations) / len(all_durations) if all_durations else 0.0
        top_paths = [
            HttpPathMetric(path=p, count=c, error_count=errors.get(p, 0))
            for p, c in sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:10]
        ]

        redis = metric_store.get_redis_stats()
        redis_hits, redis_misses = redis.get("hits", 0), redis.get("misses", 0)
        total_redis = redis_hits + redis_misses
        hit_rate = redis_hits / total_redis if total_redis else 0.0

        patterns = [
            RedisPatternMetric(pattern=p, hits=h, misses=m)
            for p, (h, m) in metric_store.get_cache_pattern_stats().items()
        ]
        command_totals, slow_redis = metric_store.get_redis_command_stats()
        command_calls = [
            RedisCommandMetric(command=c, calls=n)
            for c, n in sorted(command_totals.items(), key=lambda kv: kv[1], reverse=True)
        ]
        slow_commands = [
            SlowItem(text=cmd, duration_ms=d) for cmd, d in slow_redis
        ]

        slow_count, slow_avg = metric_store.get_slow_query_stats()
        slow_top = [
            SlowItem(text=stmt, duration_ms=d)
            for stmt, d in metric_store.get_slow_query_details()
        ]

        return SystemMetricsSnapshot(
            http_total=total,
            http_error_total=error_total,
            http_avg_duration_ms=round(avg_duration, 1),
            http_top_paths=top_paths,
            redis_hits=redis_hits,
            redis_misses=redis_misses,
            redis_hit_rate=round(hit_rate, 3),
            redis_patterns=patterns,
            redis_command_calls=command_calls,
            redis_slow_commands=slow_commands,
            slow_query_count=slow_count or 0,
            slow_query_avg_ms=round(slow_avg or 0.0, 1),
            slow_query_top=slow_top,
        )

    # ── 内部工具 ─────────────────────────────────────────
    async def _count(self, model, *filters) -> int:
        return await count_rows(self.session, model, *filters)

    async def _sum(self, model, column, *filters) -> float:
        return await sum_column(self.session, model, column, *filters)
