"""B 端图表数据服务（§8.8）。

提供工作台趋势、字数增长、阅读热力图、阅读漏斗、排行趋势、分类分布。
"""

import time
from collections import defaultdict
from datetime import date, timedelta

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.novel import Chapter, Novel
from app.models.reading import ReadingStatsDaily
from app.models.user import Reader
from app.schemas.chart import (
    BasicChartData,
    CategoryDistribution,
    ChartHeatmapCell,
    FunnelStage,
    TrendPoint,
    WordCountTrend,
)
from app.schemas.enums import BOOK_CATEGORY_LABELS

logger = structlog.get_logger(__name__)


class ChartService:
    """B 端图表数据服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ── 工作台趋势 ─────────────────────────────────────────
    async def get_workbench_trend(self, days: int = 7) -> list[TrendPoint]:
        """获取工作台趋势数据（作品/读者新增量）。

        Args:
            days: 统计天数。

        Returns:
            趋势数据点列表。
        """
        start = date.today() - timedelta(days=days)
        start_ts = int(time.mktime(start.timetuple())) * 1000
        # 作品新增趋势
        novel_stmt = select(Novel.created_at).where(
            Novel.deleted == 0, Novel.created_at >= start_ts
        )
        reader_stmt = select(Reader.created_at).where(
            Reader.deleted == 0, Reader.created_at >= start_ts
        )
        novel_ts = list((await self.session.execute(novel_stmt)).scalars().all())
        reader_ts = list((await self.session.execute(reader_stmt)).scalars().all())

        daily_map: dict[str, int] = defaultdict(int)
        for ts in novel_ts + reader_ts:
            if ts:
                day = date.fromtimestamp(ts / 1000).isoformat()
                daily_map[day] += 1

        return [TrendPoint(date=d, value=daily_map.get(d, 0)) for d in sorted(daily_map)]

    # ── 字数增长 ─────────────────────────────────────────
    async def get_word_count_growth(self, days: int = 30) -> WordCountTrend:
        """获取字数增长趋势（日增 + 累计）。

        Args:
            days: 统计天数。

        Returns:
            字数增长趋势。
        """
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
        daily_map: dict[str, int] = defaultdict(int)
        for ts, words in rows:
            if not ts:
                continue
            day = date.fromtimestamp(ts / 1000).isoformat()
            daily_map[day] += int(words or 0)

        daily: list[TrendPoint] = []
        cumulative: list[TrendPoint] = []
        running = 0
        for day in sorted(daily_map):
            words = daily_map[day]
            daily.append(TrendPoint(date=day, value=words))
            running += words
            cumulative.append(TrendPoint(date=day, value=running))
        return WordCountTrend(daily=daily, cumulative=cumulative)

    # ── 阅读热力图（7×24） ─────────────────────────────────
    async def get_reading_heatmap(self) -> list[ChartHeatmapCell]:
        """获取阅读热力图（7×24 网格）。"""
        stmt = select(
            ReadingStatsDaily.reader_id,
            ReadingStatsDaily.stat_date,
            ReadingStatsDaily.duration_minutes,
        )
        rows = (await self.session.execute(stmt)).all()
        # 聚合为 7(周) × 24(小时) 网格，但数据只有日级，简化为按周几聚合
        grid: dict[tuple[int, int], int] = defaultdict(int)
        for _, stat_date, duration in rows:
            if not stat_date:
                continue
            weekday = stat_date.weekday()
            grid[(weekday, 0)] += int(duration or 0)
        return [
            ChartHeatmapCell(day=day, hour=hour, value=grid.get((day, hour), 0))
            for day in range(7)
            for hour in range(24)
        ]

    # ── 阅读漏斗 ─────────────────────────────────────────
    async def get_reading_funnel(self) -> list[FunnelStage]:
        """获取阅读漏斗数据（基于真实行为统计）。

        曝光=已发布作品数；详情/开读/回访来自 ReadingHistory 去重读者数；
        加入书架来自 Bookshelf 去重读者数。
        """
        total_novels = await self._count(Novel, Novel.deleted == 0, Novel.status == "published")
        from app.models.reading import Bookshelf, ReadingHistory

        detail = await self._distinct_readers(ReadingHistory)
        bookshelf = await self._distinct_readers(Bookshelf)
        reading = await self._distinct_readers(
            ReadingHistory, ReadingHistory.percent > 0
        )
        seven_days = int(time.time() * 1000) - 7 * 86400 * 1000
        returned = await self._distinct_readers(
            ReadingHistory, ReadingHistory.read_at >= seven_days
        )

        counts = [total_novels, detail, bookshelf, reading, returned]
        stages = [
            ("exposure", "曝光", counts[0]),
            ("detail", "详情查看", counts[1]),
            ("bookshelf", "加入书架", counts[2]),
            ("reading", "开始阅读", counts[3]),
            ("return", "7日回访", counts[4]),
        ]
        base = stages[0][2] if stages[0][2] else 1
        return [
            FunnelStage(stage=key, label=label, count=count, percent=round(count / base * 100, 1))
            for key, label, count in stages
        ]

    async def _distinct_readers(self, model, *filters) -> int:
        """统计模型中满足条件的去重读者数。"""
        from sqlalchemy import func

        stmt = (
            select(func.count(func.distinct(model.reader_id)))
            .select_from(model)
            .where(*filters)
        )
        return int((await self.session.execute(stmt)).scalar_one() or 0)

    # ── 排行趋势 ─────────────────────────────────────────
    async def get_ranking_trend(self, days: int = 14) -> list[TrendPoint]:
        """获取排行趋势（基于点击量）。

        Args:
            days: 统计天数。

        Returns:
            排行趋势数据点 [{ date, value }]。
        """
        novels = await self._get_top_novels(10)
        return [
            TrendPoint(date=date.today().isoformat(), value=n.click_count)
            for n in novels
        ]

    # ── 分类分布 ─────────────────────────────────────────
    async def get_category_distribution(self) -> list[CategoryDistribution]:
        """获取分类分布数据（各分类作品数量及占比）。"""
        stmt = (
            select(Novel.category, func.count())
            .where(Novel.deleted == 0, Novel.status == "published")
            .group_by(Novel.category)
        )
        rows = (await self.session.execute(stmt)).all()
        total = sum(r[1] for r in rows) or 1
        return [
            CategoryDistribution(
                category=cat,
                name=BOOK_CATEGORY_LABELS.get(cat, cat),
                count=count,
                percent=round(count / total * 100, 1),
            )
            for cat, count in rows
        ]

    # ── 基础图表 ─────────────────────────────────────────
    async def get_basic_chart(self, chart_type: str) -> BasicChartData:
        """获取基础图表数据（按类型路由到对应 handler）。

        Args:
            chart_type: 图表类型标识。

        Returns:
            基础图表数据。
        """
        handlers = {
            "workbench-trend": self.get_workbench_trend,
            "word-count-growth": self.get_word_count_growth,
            "ranking-trend": self.get_ranking_trend,
            "category-distribution": self.get_category_distribution,
        }
        handler = handlers.get(chart_type)
        if not handler:
            return BasicChartData(type=chart_type, data=[])
        data = await handler()
        return BasicChartData(type=chart_type, data=data)

    # ── 图表聚合 ─────────────────────────────────────────
    async def get_dashboard_charts(self) -> dict:
        """一次返回全部业务图表数据（减少网络往返）。

        注意：AsyncSession 不支持并发查询，这里改为顺序执行，
        避免 SQLite 下 asyncio.gather 并发复用同一连接报错。
        """
        wc = await self.get_word_count_growth()
        rh = await self.get_reading_heatmap()
        rf = await self.get_reading_funnel()
        rt = await self.get_ranking_trend()
        cd = await self.get_category_distribution()
        return {
            "wordCountGrowth": [p.model_dump() for p in wc.daily],
            "readingHeatmap": [c.model_dump() for c in rh],
            "readingFunnel": [f.model_dump() for f in rf],
            "rankingTrend": [p.model_dump() for p in rt],
            "categoryDistribution": [c.model_dump() for c in cd],
        }

    # ── 内部工具 ─────────────────────────────────────────
    async def _count(self, model, *filters) -> int:
        stmt = select(func.count()).select_from(model).where(*filters)
        return (await self.session.execute(stmt)).scalar_one()

    async def _get_top_novels(self, limit: int) -> list[Novel]:
        stmt = (
            select(Novel)
            .where(Novel.deleted == 0, Novel.status == "published")
            .order_by(Novel.click_count.desc())
            .limit(limit)
        )
        return list((await self.session.execute(stmt)).scalars().all())
