"""图表数据服务测试：工作台趋势、字数增长、阅读热力图、漏斗、分类分布。"""

import time
from datetime import date

import pytest

from app.models.novel import Chapter, Novel
from app.models.reading import ReadingStatsDaily
from app.models.user import Reader
from app.services.chart_service import ChartService


@pytest.fixture
def svc(db_session):
    return ChartService(db_session)


async def _create_novel(session, **kwargs):
    defaults = {
        "title": "测试小说",
        "author_name": "测试作者",
        "category": "xuanhuan",
        "status": "published",
        "word_count": 10000,
        "click_count": 100,
    }
    defaults.update(kwargs)
    novel = Novel(**defaults)
    session.add(novel)
    await session.flush()
    return novel


async def _create_chapter(session, novel_id, **kwargs):
    now = int(time.time() * 1000)
    defaults = {
        "novel_id": novel_id,
        "index": 1,
        "title": "第一章",
        "content": "内容",
        "status": "published",
        "word_count": 500,
        "published_at": now,
    }
    defaults.update(kwargs)
    chapter = Chapter(**defaults)
    session.add(chapter)
    await session.flush()
    return chapter


class TestWorkbenchTrend:
    async def test_empty(self, svc):
        result = await svc.get_workbench_trend(7)
        assert len(result) == 0

    async def test_with_data(self, svc, db_session):
        now = int(time.time() * 1000)
        await _create_novel(db_session, created_at=now)
        result = await svc.get_workbench_trend(7)
        assert len(result) >= 1

    async def test_with_reader_and_novel(self, svc, db_session):
        now = int(time.time() * 1000)
        await _create_novel(db_session, created_at=now)
        reader = Reader(id=999, username="reader1", created_at=now)
        db_session.add(reader)
        await db_session.flush()
        result = await svc.get_workbench_trend(7)
        today = date.today().isoformat()
        matches = [p for p in result if p.date == today]
        assert len(matches) == 1
        assert matches[0].value >= 2


class TestWordCountGrowth:
    async def test_empty(self, svc):
        result = await svc.get_word_count_growth(30)
        assert len(result.daily) == 0
        assert len(result.cumulative) == 0

    async def test_with_chapter(self, svc, db_session):
        novel = await _create_novel(db_session)
        await _create_chapter(db_session, novel.id, word_count=1000)
        result = await svc.get_word_count_growth(30)
        assert len(result.daily) >= 1
        assert result.daily[0].value >= 1000

    async def test_cumulative_accumulates(self, svc, db_session):
        novel = await _create_novel(db_session)
        await _create_chapter(db_session, novel.id, word_count=500)
        await _create_chapter(db_session, novel.id, index=2, word_count=300)
        result = await svc.get_word_count_growth(30)
        today = date.today().isoformat()
        cum = [p for p in result.cumulative if p.date == today]
        assert len(cum) == 1
        assert cum[0].value == 800


class TestReadingHeatmap:
    async def test_empty(self, svc):
        result = await svc.get_reading_heatmap()
        assert len(result) == 7 * 24
        assert all(c.value == 0 for c in result)

    async def test_with_data(self, svc, db_session):
        today = date.today()
        stats = ReadingStatsDaily(
            reader_id=1, stat_date=today, duration_minutes=30, words=500
        )
        db_session.add(stats)
        await db_session.flush()
        result = await svc.get_reading_heatmap()
        weekday = today.weekday()
        weekday_cells = [c for c in result if c.day == weekday]
        assert len(weekday_cells) == 24
        assert weekday_cells[0].value >= 30


class TestReadingFunnel:
    async def test_empty(self, svc):
        result = await svc.get_reading_funnel()
        assert len(result) == 5
        assert result[0].count == 0
        assert result[0].percent == 0.0

    async def test_with_novels(self, svc, db_session):
        await _create_novel(db_session)
        await _create_novel(db_session, title="小说B")
        result = await svc.get_reading_funnel()
        assert result[0].count == 2
        assert result[0].percent == 100.0


class TestRankingTrend:
    async def test_empty(self, svc):
        result = await svc.get_ranking_trend(14)
        assert len(result) == 0

    async def test_with_novels(self, svc, db_session):
        await _create_novel(db_session, click_count=500)
        await _create_novel(db_session, title="热门", click_count=1000)
        result = await svc.get_ranking_trend(14)
        assert len(result) == 2
        assert result[0].value >= result[1].value


class TestCategoryDistribution:
    async def test_empty(self, svc):
        result = await svc.get_category_distribution()
        assert len(result) == 0

    async def test_with_novels(self, svc, db_session):
        await _create_novel(db_session, category="xuanhuan")
        await _create_novel(db_session, title="B", category="xianxia")
        result = await svc.get_category_distribution()
        assert len(result) == 2
        cat_map = {c.category: c for c in result}
        assert cat_map["xuanhuan"].count == 1
        assert cat_map["xianxia"].count == 1

    async def test_percent_sum(self, svc, db_session):
        await _create_novel(db_session, category="xuanhuan")
        await _create_novel(db_session, title="B", category="xuanhuan")
        await _create_novel(db_session, title="C", category="xianxia")
        result = await svc.get_category_distribution()
        total = sum(c.percent for c in result)
        assert abs(total - 100.0) < 0.1


class TestBasicChart:
    async def test_unknown_type(self, svc):
        result = await svc.get_basic_chart("unknown")
        assert result.type == "unknown"
        assert len(result.data) == 0

    async def test_workbench_trend(self, svc, db_session):
        now = int(time.time() * 1000)
        await _create_novel(db_session, created_at=now)
        result = await svc.get_basic_chart("workbench-trend")
        assert result.type == "workbench-trend"
        assert len(result.data) > 0

    async def test_ranking_trend(self, svc, db_session):
        await _create_novel(db_session, click_count=100)
        result = await svc.get_basic_chart("ranking-trend")
        assert result.type == "ranking-trend"
        assert len(result.data) > 0


class TestInternalUtils:
    async def test_count(self, svc, db_session):
        await _create_novel(db_session)
        cnt = await svc._count(Novel, Novel.deleted == 0)
        assert cnt == 1

    async def test_get_top_novels(self, svc, db_session):
        await _create_novel(db_session, click_count=50)
        await _create_novel(db_session, title="热门", click_count=200)
        novels = await svc._get_top_novels(1)
        assert len(novels) == 1
        assert novels[0].click_count == 200
