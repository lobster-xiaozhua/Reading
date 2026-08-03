"""互动服务测试（书架、阅读进度、评论、打赏、评分）。"""

import pytest

from app.core.exceptions import NotFoundError, ParamError
from app.models.novel import Novel
from app.services.interaction_service import InteractionService


@pytest.fixture
def svc(db_session, redis_client):
    return InteractionService(db_session, redis_client)


async def _create_published_novel(session, **kwargs):
    defaults = {
        "title": "测试小说",
        "author_name": "测试作者",
        "category": "xuanhuan",
        "status": "published",
        "word_count": 10000,
        "is_completed": 0,
    }
    defaults.update(kwargs)
    novel = Novel(**defaults)
    session.add(novel)
    await session.flush()
    return novel


class TestBookshelf:
    async def test_add_to_bookshelf(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        result = await svc.add_to_bookshelf(1, novel.id)
        assert result is True

    async def test_add_to_bookshelf_novel_not_found(self, svc):
        with pytest.raises(NotFoundError):
            await svc.add_to_bookshelf(1, 999)

    async def test_add_to_bookshelf_idempotent(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        await svc.add_to_bookshelf(1, novel.id)
        result = await svc.add_to_bookshelf(1, novel.id)
        assert result is True

    async def test_remove_from_bookshelf(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        await svc.add_to_bookshelf(1, novel.id)
        result = await svc.remove_from_bookshelf(1, novel.id)
        assert result is True

    async def test_remove_from_bookshelf_not_exists(self, svc, db_session):
        result = await svc.remove_from_bookshelf(1, 999)
        assert result is False


class TestReadingProgress:
    async def test_report_reading_progress(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        result = await svc.report_reading_progress(1, novel.id, 1, 0, 50.0)
        assert result is True

    async def test_report_reading_progress_no_chapter(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        result = await svc.report_reading_progress(1, novel.id, None, None, 0.0)
        assert result is True


class TestComment:
    async def test_create_comment(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        comment_id = await svc.create_comment(1, novel.id, "很好看的小说", 5)
        assert comment_id is not None

    async def test_create_comment_empty_content(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        with pytest.raises(ParamError):
            await svc.create_comment(1, novel.id, "", 5)

    async def test_like_comment(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        comment_id = await svc.create_comment(1, novel.id, "好文", 4)
        result = await svc.like_comment(int(comment_id), 2)
        assert result is True

    async def test_like_comment_not_found(self, svc):
        with pytest.raises(NotFoundError):
            await svc.like_comment(999, 1)


class TestReward:
    async def test_create_reward(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        reward_id = await svc.create_reward(1, novel.id, "tip", 100)
        assert reward_id is not None

    async def test_create_reward_invalid_amount(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        with pytest.raises(ParamError):
            await svc.create_reward(1, novel.id, "tip", 0)

    async def test_create_reward_different_types(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        r1 = await svc.create_reward(1, novel.id, "ticket", 1)
        r2 = await svc.create_reward(1, novel.id, "recommend", 5)
        r3 = await svc.create_reward(1, novel.id, "tip", 50)
        assert r1 is not None
        assert r2 is not None
        assert r3 is not None


class TestRating:
    async def test_submit_rating(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        result = await svc.submit_rating(1, novel.id, 5)
        assert result is True

    async def test_submit_rating_out_of_range(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        with pytest.raises(ParamError):
            await svc.submit_rating(1, novel.id, 6)
        with pytest.raises(ParamError):
            await svc.submit_rating(1, novel.id, 0)
