"""工作台服务测试。"""

import time
from datetime import date

import pytest
from app.models.novel import Novel, Chapter
from app.models.user import Author, Reader
from app.models.interaction import RewardRecord, Comment
from app.services.workbench_service import WorkbenchService


@pytest.fixture
def svc(db_session, redis_client):
    return WorkbenchService(db_session, redis_client)


class TestWorkbenchKpi:
    async def test_kpi_empty(self, svc):
        kpi = await svc.get_kpi()
        assert kpi.total_novels == 0
        assert kpi.total_authors == 0
        assert kpi.total_readers == 0
        assert kpi.pending_audit == 0
        assert kpi.published_novels == 0
        assert kpi.today_revenue == 0.0

    async def test_kpi_with_data(self, svc, db_session):
        db_session.add(Novel(title="小说A", author_name="作者A", category="xuanhuan", status="published", word_count=5000, is_completed=0))
        db_session.add(Novel(title="小说B", author_name="作者B", category="xianxia", status="pending", word_count=3000, is_completed=0))
        db_session.add(Author(pen_name="作者A", contract_type="buyout", contract_rate=50.0))
        db_session.add(Reader(username="reader1", nickname="读者1"))
        await db_session.flush()

        kpi = await svc.get_kpi()
        assert kpi.total_novels == 2
        assert kpi.published_novels == 1
        assert kpi.pending_audit == 1
        assert kpi.total_authors == 1
        assert kpi.total_readers == 1

    async def test_kpi_cache(self, svc, db_session, redis_client):
        db_session.add(Novel(title="小说A", author_name="作者A", category="xuanhuan", status="published", word_count=5000, is_completed=0))
        await db_session.flush()

        kpi1 = await svc.get_kpi()
        assert kpi1.total_novels == 1

        db_session.add(Novel(title="小说B", author_name="作者B", category="xianxia", status="pending", word_count=3000, is_completed=0))
        await db_session.flush()

        kpi2 = await svc.get_kpi()
        assert kpi2.total_novels == 1


class TestWorkbenchWordTrend:
    async def test_word_trend_empty(self, svc):
        trend = await svc.get_word_count_trend(30)
        assert len(trend.daily) == 0
        assert len(trend.cumulative) == 0

    async def test_word_trend_with_chapters(self, svc, db_session):
        today_ts = int(time.mktime(date.today().timetuple())) * 1000
        db_session.add(Chapter(novel_id=1, index=1, title="第一章", content="test", word_count=1000, status="published", published_at=today_ts - 86400000))
        db_session.add(Chapter(novel_id=1, index=2, title="第二章", content="test", word_count=2000, status="published", published_at=today_ts))
        await db_session.flush()

        trend = await svc.get_word_count_trend(30)
        assert len(trend.daily) > 0
        assert trend.cumulative[-1].value == 3000


class TestWorkbenchOverviews:
    async def test_overviews_empty(self, svc):
        items = await svc.get_overviews()
        assert len(items) == 5
        for item in items:
            assert item["value"] == 0

    async def test_overviews_with_data(self, svc, db_session):
        today_ts = int(time.mktime(date.today().timetuple())) * 1000
        db_session.add(Novel(title="小说A", author_name="作者A", category="xuanhuan", status="published", word_count=5000, is_completed=0))
        db_session.add(RewardRecord(reader_id=1, novel_id=1, type="tip", amount=100, created_at=today_ts))
        db_session.add(Comment(novel_id=1, reader_id=1, content="好文", status=1, created_at=today_ts))
        await db_session.flush()

        items = await svc.get_overviews()
        overview = {item["key"]: item["value"] for item in items}
        assert overview["totalNovels"] == 1
        assert overview["todayRewards"] == 1
        assert overview["todayComments"] == 1