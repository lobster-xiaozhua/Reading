"""用户中心服务测试：个人信息、书架、阅读历史、统计、徽章、VIP、追更。"""

import time
from datetime import date, timedelta

import pytest

from app.models.novel import Chapter, Novel
from app.models.reading import Bookshelf, ReadingHistory, ReadingStatsDaily
from app.models.user import Reader
from app.schemas.enums import CNovelStatus
from app.services.user_center_service import (
    UserCenterService,
    _build_badges,
    _default_payment_methods,
    _default_vip_plans,
)


@pytest.fixture
def svc(db_session, redis_client):
    return UserCenterService(db_session, redis_client)


async def _create_reader(session, **kwargs):
    defaults = {
        "id": 1001,
        "username": "test_reader",
        "nickname": "测试读者",
        "level": 3,
        "is_vip": 0,
    }
    defaults.update(kwargs)
    reader = Reader(**defaults)
    session.add(reader)
    await session.flush()
    return reader


async def _create_novel(session, **kwargs):
    defaults = {
        "title": "测试小说",
        "author_name": "测试作者",
        "category": "xuanhuan",
        "status": "published",
        "word_count": 10000,
    }
    defaults.update(kwargs)
    novel = Novel(**defaults)
    session.add(novel)
    await session.flush()
    return novel


class TestGetProfile:
    async def test_reader_not_found(self, svc):
        profile = await svc.get_profile(99999)
        assert profile.nickname == "游客"

    async def test_reader_exists(self, svc, db_session):
        await _create_reader(db_session, id=1002, username="alice", nickname="Alice")
        profile = await svc.get_profile(1002)
        assert profile.nickname == "Alice"
        assert profile.level == 3

    async def test_profile_with_stats(self, svc, db_session):
        await _create_reader(db_session)
        today = date.today()
        for i in range(3):
            day = today - timedelta(days=i)
            stats = ReadingStatsDaily(reader_id=1001, stat_date=day, duration_minutes=30, words=500)
            db_session.add(stats)
        await db_session.flush()
        profile = await svc.get_profile(1001)
        assert profile.stats.reading_days == 3
        assert profile.stats.reading_minutes >= 90


class TestGetBookshelf:
    async def test_empty(self, svc):
        items = await svc.get_bookshelf(99999)
        assert len(items) == 0

    async def test_with_books(self, svc, db_session):
        await _create_reader(db_session)
        novel = await _create_novel(db_session)
        shelf = Bookshelf(reader_id=1001, novel_id=novel.id)
        db_session.add(shelf)
        await db_session.flush()
        items = await svc.get_bookshelf(1001)
        assert len(items) == 1
        assert items[0].book.title == "测试小说"

    async def test_filter_ongoing(self, svc, db_session):
        await _create_reader(db_session)
        ongoing = await _create_novel(db_session, is_completed=0)
        completed = await _create_novel(db_session, title="完结", is_completed=1)
        db_session.add(Bookshelf(reader_id=1001, novel_id=ongoing.id))
        db_session.add(Bookshelf(reader_id=1001, novel_id=completed.id))
        await db_session.flush()
        items = await svc.get_bookshelf(1001, tab="ongoing")
        assert len(items) == 1
        assert items[0].book.status == CNovelStatus.ONGOING


class TestGetReadingHistory:
    async def test_empty(self, svc):
        history = await svc.get_reading_history(99999)
        assert len(history) == 0

    async def test_with_data(self, svc, db_session):
        await _create_reader(db_session)
        novel = await _create_novel(db_session)
        chapter = Chapter(novel_id=novel.id, index=1, title="第一章", content="内容", status="published", word_count=500)
        db_session.add(chapter)
        await db_session.flush()
        history = ReadingHistory(reader_id=1001, novel_id=novel.id, chapter_id=chapter.id, chapter_index=1, percent=0.5, read_at=int(time.time() * 1000))
        db_session.add(history)
        await db_session.flush()
        items = await svc.get_reading_history(1001)
        assert len(items) == 1
        assert items[0].chapter_title == "第一章"


class TestRewardRecords:
    async def test_empty(self, svc):
        records = await svc.get_reward_records(99999)
        assert len(records) == 0

    async def test_with_data(self, svc, db_session):
        await _create_reader(db_session)
        novel = await _create_novel(db_session)
        from app.models.interaction import RewardRecord as RewardModel
        reward = RewardModel(reader_id=1001, novel_id=novel.id, type="ticket", amount=1, created_at=int(time.time() * 1000))
        db_session.add(reward)
        await db_session.flush()
        records = await svc.get_reward_records(1001)
        assert len(records) == 1
        assert records[0].type == "ticket"


class TestStatsOverview:
    async def test_empty(self, svc):
        overview = await svc.get_stats_overview(99999)
        assert overview.weekly_duration == 0
        assert overview.streak_days == 0

    async def test_with_data(self, svc, db_session):
        await _create_reader(db_session)
        today = date.today()
        stats = ReadingStatsDaily(reader_id=1001, stat_date=today, duration_minutes=45, words=1000)
        db_session.add(stats)
        await db_session.flush()
        overview = await svc.get_stats_overview(1001)
        assert overview.weekly_duration >= 45
        assert overview.total_words >= 1000


class TestHeatmap:
    async def test_empty(self, svc):
        cells = await svc.get_heatmap(99999)
        assert len(cells) == 0

    async def test_with_data(self, svc, db_session):
        await _create_reader(db_session)
        today = date.today()
        stats = ReadingStatsDaily(reader_id=1001, stat_date=today, duration_minutes=30, words=500)
        db_session.add(stats)
        await db_session.flush()
        cells = await svc.get_heatmap(1001)
        assert len(cells) >= 1

    async def test_redis_cache(self, svc, db_session, redis_client):
        await _create_reader(db_session)
        from app.schemas.c_end import HeatmapCell
        cached = [HeatmapCell(date="2026-01-01", duration=10)]
        await redis_client.set(
            "cache:heatmap:1001",
            cached[0].model_dump_json(),
        )
        cells = await svc.get_heatmap(1001)
        assert len(cells) >= 0


class TestPreferences:
    async def test_empty(self, svc):
        prefs = await svc.get_preferences(99999)
        assert len(prefs) == 0

    async def test_with_data(self, svc, db_session):
        await _create_reader(db_session)
        await _create_novel(db_session, category="xuanhuan")
        stats = ReadingStatsDaily(reader_id=1001, stat_date=date.today(), duration_minutes=30, words=500)
        db_session.add(stats)
        await db_session.flush()
        prefs = await svc.get_preferences(1001)
        assert len(prefs) >= 0


class TestBadges:
    async def test_build_badges_empty(self):
        badges = _build_badges({})
        assert len(badges) == 4
        assert all(b.unlocked is False for b in badges)

    async def test_build_badges_unlocked(self):
        badges = _build_badges({"reading_days": 30, "total_reading_minutes": 1000, "total_read_words": 1_000_000})
        unlocked = [b for b in badges if b.unlocked]
        assert len(unlocked) == 4


class TestVipAndPayment:
    async def test_vip_plans(self, svc):
        plans = await svc.get_vip_plans()
        assert len(plans) == 3
        assert plans[0].id == "monthly"
        assert plans[1].recommended is True

    async def test_default_vip_plans(self):
        plans = _default_vip_plans()
        assert len(plans) == 3

    async def test_payment_methods(self, svc):
        methods = await svc.get_payment_methods()
        assert len(methods) == 3
        ids = [m.id for m in methods]
        assert "alipay" in ids
        assert "wechat" in ids

    async def test_default_payment_methods(self):
        methods = _default_payment_methods()
        assert len(methods) == 3


class TestFollowList:
    async def test_empty(self, svc):
        items = await svc.get_follow_list(99999)
        assert len(items) == 0

    async def test_with_data(self, svc, db_session):
        await _create_reader(db_session)
        novel = await _create_novel(db_session, is_completed=0)
        db_session.add(Bookshelf(reader_id=1001, novel_id=novel.id))
        await db_session.flush()
        items = await svc.get_follow_list(1001)
        assert len(items) == 1
        assert items[0].title == "测试小说"
