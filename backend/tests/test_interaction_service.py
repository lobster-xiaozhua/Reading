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


class TestLikeSelf:
    async def test_like_own_comment_returns_true_without_increment(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        comment_id = await svc.create_comment(1, novel.id, "自评", 4)
        result = await svc.like_comment(int(comment_id), 1)
        assert result is True


class TestReviewsTopicsBookLists:
    async def test_get_reviews(self, svc, db_session):
        novel = await _create_published_novel(db_session, title="书评测试书", cover="cover.jpg")
        from app.models.interaction import Review as ReviewModel

        db_session.add(
            ReviewModel(
                reader_id=1,
                novel_id=novel.id,
                rating=5,
                content="很好看",
                likes=10,
                replies=2,
                created_at=1,
            )
        )
        await db_session.commit()
        reviews = await svc.get_reviews()
        assert len(reviews) == 1
        assert reviews[0].book.title == "书评测试书"
        assert reviews[0].likes == 10
        assert reviews[0].replies == 2

    async def test_get_reviews_empty(self, svc):
        assert await svc.get_reviews() == []

    async def test_get_topics(self, svc, db_session):
        from app.models.novel import Tag

        db_session.add(Tag(name="爽文", ref_count=100))
        db_session.add(Tag(name="穿越", ref_count=50))
        await db_session.commit()
        topics = await svc.get_topics()
        assert len(topics) == 2
        assert topics[0].name == "爽文"
        assert topics[0].count == 100

    async def test_get_book_lists_groups_by_category(self, svc, db_session):
        await _create_published_novel(db_session, title="玄幻一", category="xuanhuan", rating=9.5, follow_count=100)
        await _create_published_novel(db_session, title="玄幻二", category="xuanhuan", rating=8.5, follow_count=50)
        await _create_published_novel(db_session, title="都市一", category="urban", rating=9.0, follow_count=80)
        book_lists = await svc.get_book_lists(limit=10)
        assert len(book_lists) == 2
        assert {bl.book_count for bl in book_lists} == {1, 2}
        assert all(bl.title.endswith("精选书单") for bl in book_lists)

    async def test_get_book_lists_empty(self, svc):
        assert await svc.get_book_lists() == []

    async def test_report_reading_progress_redis_failure_still_succeeds(self, db_session):
        novel = await _create_published_novel(db_session)

        class _BrokenRedis:
            async def hset(self, *args, **kwargs):
                raise ConnectionError("redis down")

            async def expire(self, *args, **kwargs):
                raise ConnectionError("redis down")

        svc = InteractionService(db_session, _BrokenRedis())
        result = await svc.report_reading_progress(1, novel.id, 1, 0, 50.0)
        assert result is True
